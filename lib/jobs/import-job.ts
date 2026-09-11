import type { Locale } from "@/lib/config/env";
import { createId } from "@/lib/utils";
import { mergeInstagramData } from "@/lib/instagram";
import { InstagramUrlError, isDemoUsername, normalizeInstagramUrl } from "@/lib/instagram/url";
import { getAIAnalyzer } from "@/lib/ai";
import { persistImportMedia } from "@/lib/storage";
import { generateWebsiteConfig, websiteSlug, allocateUniqueSlug } from "@/lib/website";
import { readStore, writeStore } from "@/lib/database/store";
import { getInstagramCollector as resolveCollector } from "@/lib/instagram/collector";
import { isApifyConfigured, isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CollectorError } from "@/types/instagram";
import type { ImportJob, ImportJobStage } from "@/types/jobs";
import { countWebsitesForWorkspace } from "@/lib/database/queries";
import { planLimits } from "@/lib/config/plans";
import type { PlanId } from "@/lib/config/plans";
import { IMPORT_POSTS_LIMIT, IMPORT_STALE_MS } from "@/lib/config/import";

export { IMPORT_STALE_MS };

const STAGES: ImportJobStage[] = [
  "connecting",
  "profile_found",
  "reading_content",
  "posts_imported",
  "understanding_brand",
  "creating_website",
  "ready",
];

function now() {
  return new Date().toISOString();
}

function collectorLabel(username: string) {
  if (isDemoUsername(username)) return "mock";
  return isApifyConfigured() ? "apify" : "mock";
}

function isActiveStatus(status: ImportJob["status"]) {
  return (
    status === "queued" ||
    status === "scraping" ||
    status === "processing" ||
    status === "analyzing" ||
    status === "generating"
  );
}

function publicError(code?: string) {
  switch (code) {
    case "INVALID_URL":
    case "UNSUPPORTED_URL":
    case "INVALID_USERNAME":
      return { code: "INVALID_URL", message: "Enter a valid Instagram profile URL." };
    case "PRIVATE":
      return {
        code: "PRIVATE",
        message: "This profile is private. Connect an account you own or use a public profile.",
      };
    case "NOT_FOUND":
      return { code: "NOT_FOUND", message: "We couldn't find this Instagram profile." };
    case "RATE_LIMITED":
      return {
        code: "RATE_LIMITED",
        message: "Instagram data is temporarily unavailable. Please try again.",
      };
    case "PARTIAL":
      return {
        code: "PARTIAL",
        message: "We imported what was available and can still build your website.",
      };
    case "AI_FAILED":
      return {
        code: "AI_FAILED",
        message: "We imported your content, but AI analysis needs another attempt.",
      };
    case "MEDIA_PERSIST_FAILED":
      return {
        code: "MEDIA_PERSIST_FAILED",
        message: "We couldn't save Instagram media to our storage. Please try again.",
      };
    default:
      return {
        code: "SCRAPE_FAILED",
        message: "Something went wrong while importing your profile.",
      };
  }
}

function jobToRow(job: ImportJob): Record<string, unknown> {
  return {
    id: job.id,
    workspace_id: job.workspaceId,
    user_id: job.userId,
    source_url: job.sourceUrl,
    username: job.username,
    status: job.status,
    stage: job.stage,
    collector: job.collector,
    scrape_status: job.scrapeStatus ?? null,
    import_id: job.importId ?? null,
    website_id: job.websiteId ?? null,
    error_code: job.errorCode ?? null,
    error_message: job.errorMessage ?? null,
    retry_count: job.retryCount,
    posts_imported: job.postsImported,
    started_at: job.startedAt,
    completed_at: job.completedAt ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

function patchToRow(patch: Partial<ImportJob>): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: now() };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.stage !== undefined) row.stage = patch.stage;
  if (patch.collector !== undefined) row.collector = patch.collector;
  if (patch.scrapeStatus !== undefined) row.scrape_status = patch.scrapeStatus;
  if (patch.importId !== undefined) row.import_id = patch.importId;
  if (patch.websiteId !== undefined) row.website_id = patch.websiteId;
  if (patch.errorCode !== undefined) row.error_code = patch.errorCode;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  if (patch.retryCount !== undefined) row.retry_count = patch.retryCount;
  if (patch.postsImported !== undefined) row.posts_imported = patch.postsImported;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  if (patch.username !== undefined) row.username = patch.username;
  return row;
}

async function updateJob(id: string, patch: Partial<ImportJob>) {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { error } = await db
      .from("import_jobs")
      .update(patchToRow(patch))
      .eq("id", id);
    if (error) throw error;
    return;
  }

  await writeStore((store) => {
    const job = store.jobs.find((item) => item.id === id);
    if (!job) return;
    Object.assign(job, patch, { updatedAt: now() });
  });
}

async function insertJob(job: ImportJob) {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { error } = await db.from("import_jobs").insert(jobToRow(job));
    if (error) throw error;
    return;
  }
  await writeStore((store) => {
    store.jobs.unshift(job);
  });
}

export async function failStaleImportJob(job: ImportJob): Promise<ImportJob> {
  if (!isActiveStatus(job.status)) return job;
  const updatedAt = Date.parse(job.updatedAt || job.createdAt);
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt < IMPORT_STALE_MS) {
    return job;
  }
  const mapped = publicError("RATE_LIMITED");
  await updateJob(job.id, {
    status: "failed",
    errorCode: mapped.code,
    errorMessage: mapped.message,
    completedAt: now(),
  });
  return {
    ...job,
    status: "failed",
    errorCode: mapped.code,
    errorMessage: mapped.message,
    completedAt: now(),
    updatedAt: now(),
  };
}

export async function findCachedWebsite(workspaceId: string, username: string) {
  const store = await readStore();
  const key = username.toLowerCase();
  const imported = store.imports.find(
    (item) =>
      item.workspaceId === workspaceId && item.username.toLowerCase() === key,
  );
  if (imported) {
    const byImport = store.websites.find(
      (item) => item.workspaceId === workspaceId && item.importId === imported.id,
    );
    if (byImport) return { website: byImport, imported, fromCache: true as const };
  }

  const bySlug = store.websites.find(
    (item) =>
      item.workspaceId === workspaceId && item.slug.toLowerCase() === key,
  );
  if (bySlug) {
    const related = store.imports.find((item) => item.id === bySlug.importId);
    return { website: bySlug, imported: related, fromCache: true as const };
  }

  return null;
}

export class PlanLimitError extends Error {
  code = "PLAN_LIMIT" as const;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export async function createImportJob(input: {
  userId: string;
  workspaceId: string;
  sourceUrl: string;
  locale: Locale;
  forceRefresh?: boolean;
  plan?: PlanId | string;
}) {
  let parsed;
  try {
    parsed = normalizeInstagramUrl(input.sourceUrl);
  } catch (error) {
    if (error instanceof InstagramUrlError) {
      throw error;
    }
    throw new InstagramUrlError("Enter a valid Instagram profile URL.", "INVALID_URL");
  }

  if (!input.forceRefresh) {
    const cached = await findCachedWebsite(input.workspaceId, parsed.username);
    if (cached) {
      const job: ImportJob = {
        id: createId("job"),
        workspaceId: input.workspaceId,
        userId: input.userId,
        sourceUrl: parsed.profileUrl,
        username: parsed.username,
        status: "completed",
        stage: "ready",
        collector: "cache",
        retryCount: 0,
        postsImported:
          (cached.imported?.posts.length ?? 0) + (cached.imported?.reels.length ?? 0),
        startedAt: now(),
        createdAt: now(),
        updatedAt: now(),
        completedAt: now(),
        importId: cached.imported?.id,
        websiteId: cached.website.id,
        scrapeStatus: cached.imported?.scrapeStatus,
      };
      await insertJob(job);
      return job;
    }
  }

  const cached = await findCachedWebsite(input.workspaceId, parsed.username);
  if (!cached) {
    const limits = planLimits(input.plan);
    const count = await countWebsitesForWorkspace(input.workspaceId);
    if (count >= limits.maxWebsites) {
      throw new PlanLimitError(
        `Your plan allows ${limits.maxWebsites} site(s). Upgrade to Pro or unpublish/delete an existing site.`,
      );
    }
  }

  const job: ImportJob = {
    id: createId("job"),
    workspaceId: input.workspaceId,
    userId: input.userId,
    sourceUrl: parsed.profileUrl,
    username: parsed.username,
    status: "queued",
    stage: "connecting",
    collector: collectorLabel(parsed.username),
    retryCount: 0,
    postsImported: 0,
    startedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  };

  await insertJob(job);

  // Caller must schedule processImportJob via next/server `after()` so work
  // survives after the HTTP response (void fire-and-forget gets cancelled).
  return job;
}

export async function processImportJob(jobId: string, locale: Locale) {
  const store = await readStore();
  const job = store.jobs.find((item) => item.id === jobId);
  if (!job || !job.username) return;
  if (job.status === "completed" || job.status === "failed") return;

  // Another worker already claimed this job recently.
  if (
    job.status !== "queued" &&
    isActiveStatus(job.status) &&
    Date.now() - Date.parse(job.updatedAt || job.createdAt) < 15_000
  ) {
    return;
  }

  try {
    await updateJob(jobId, { status: "scraping", stage: "connecting" });

    const collector = resolveCollector(job.username);
    const profile = await collector.scrapeProfile(job.sourceUrl);

    if (profile.isPrivate) {
      throw new CollectorError("This profile is private.", "PRIVATE");
    }

    await updateJob(jobId, { status: "scraping", stage: "profile_found" });
    await updateJob(jobId, { status: "scraping", stage: "reading_content" });

    const posts = await collector.scrapePosts(job.sourceUrl, IMPORT_POSTS_LIMIT);
    const imported = mergeInstagramData({
      workspaceId: job.workspaceId,
      sourceUrl: job.sourceUrl,
      profile,
      posts,
      requestedLimit: IMPORT_POSTS_LIMIT,
      collector: job.collector,
    });

    await persistImportMedia(imported);
    await updateJob(jobId, {
      status: "processing",
      stage: "posts_imported",
      postsImported: posts.length,
      scrapeStatus: imported.scrapeStatus,
    });

    await writeStore((draft) => {
      const existing = draft.imports.findIndex(
        (item) =>
          item.workspaceId === job.workspaceId &&
          item.username.toLowerCase() === imported.username.toLowerCase(),
      );
      if (existing >= 0) draft.imports[existing] = imported;
      else draft.imports.unshift(imported);
    });

    await updateJob(jobId, { status: "analyzing", stage: "understanding_brand" });
    const analysis = await getAIAnalyzer(job.username).analyzeImport({
      profile,
      posts,
      locale,
    });
    imported.aiAnalysis = analysis;

    await updateJob(jobId, { status: "generating", stage: "creating_website" });
    const config = generateWebsiteConfig({ imported, analysis, locale });
    imported.websiteConfig = config;

    const generatedWebsiteId = createId("web");
    const baseSlug = websiteSlug(analysis.businessName, imported.username);
    const existingForWorkspace = (await readStore()).websites.find(
      (item) =>
        item.workspaceId === job.workspaceId &&
        (item.slug === baseSlug ||
          item.slug.toLowerCase() === imported.username.toLowerCase()),
    );
    const slug = await allocateUniqueSlug({
      base: baseSlug,
      workspaceId: job.workspaceId,
      websiteId: existingForWorkspace?.id,
    });
    let websiteId = generatedWebsiteId;

    await writeStore((draft) => {
      const current = draft.imports.find((item) => item.id === imported.id);
      if (current) {
        current.aiAnalysis = analysis;
        current.websiteConfig = config;
        current.updatedAt = now();
      }
      const existingSite = draft.websites.findIndex(
        (item) =>
          item.workspaceId === job.workspaceId &&
          (item.slug === baseSlug ||
            item.slug === slug ||
            item.slug.toLowerCase() === imported.username.toLowerCase() ||
            item.id === existingForWorkspace?.id),
      );
      if (existingSite >= 0) {
        websiteId = draft.websites[existingSite].id;
        draft.websites[existingSite] = {
          ...draft.websites[existingSite],
          importId: imported.id,
          slug,
          config,
          status: "draft",
          version: draft.websites[existingSite].version + 1,
          updatedAt: now(),
        };
      } else {
        draft.websites.unshift({
          id: generatedWebsiteId,
          workspaceId: job.workspaceId,
          importId: imported.id,
          slug,
          config,
          status: "draft",
          version: 1,
          createdAt: now(),
          updatedAt: now(),
          publishedAt: null,
        });
      }
    });

    await updateJob(jobId, {
      status: "completed",
      stage: "ready",
      importId: imported.id,
      websiteId,
      completedAt: now(),
    });
  } catch (error) {
    const code =
      error instanceof InstagramUrlError
        ? error.code
        : error instanceof CollectorError
          ? error.code
          : error instanceof Error && error.message.includes("MEDIA_PERSIST")
            ? "MEDIA_PERSIST_FAILED"
          : error instanceof Error && error.message.includes("AI")
            ? "AI_FAILED"
            : "SCRAPE_FAILED";
    const mapped = publicError(code);
    await updateJob(jobId, {
      status: "failed",
      errorCode: mapped.code,
      errorMessage: mapped.message,
      completedAt: now(),
    });
  }
}

export { publicError, STAGES };
