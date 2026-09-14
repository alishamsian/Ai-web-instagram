import type { Locale } from "@/lib/config/env";
import { createId } from "@/lib/utils";
import { mergeInstagramData } from "@/lib/instagram";
import { InstagramUrlError, isDemoUsername, normalizeInstagramUrl } from "@/lib/instagram/url";
import { getAIAnalyzer } from "@/lib/ai";
import {
  ensureWebsiteConfigMediaHosted,
  persistImportMedia,
} from "@/lib/storage";
import { buildWebsiteConfigFromInstagram, websiteSlug, allocateUniqueSlug } from "@/lib/website";
import { heuristicAnalysisFromImport } from "@/lib/instagram/pipeline";
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
import { clampImportPosts, IMPORT_POSTS_HARD_MAX, importStaleMs } from "@/lib/config/import";
import { logError, logInfo, logWarn } from "@/lib/observability/log";
import { publicError } from "@/lib/jobs/errors";
import { recordProductEvent, recordSystemEvent } from "@/lib/admin/events";
import { recordUsageEvent } from "@/lib/admin/usage";
import { recordAiUsage } from "@/lib/admin/ai-telemetry";
import { computeJobDurationMs } from "@/lib/admin/jobs";
import { incrementDailyMetrics } from "@/lib/admin/metrics";

export { IMPORT_STALE_MS } from "@/lib/config/import";
export { publicError } from "@/lib/jobs/errors";

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
    posts_limit: job.postsLimit ?? null,
    started_at: job.startedAt,
    completed_at: job.completedAt ?? null,
    duration_ms: job.durationMs ?? null,
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
  if (patch.postsLimit !== undefined) row.posts_limit = patch.postsLimit;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  if (patch.durationMs !== undefined) row.duration_ms = patch.durationMs;
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
  const staleAfter = importStaleMs(job.postsLimit);
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt < staleAfter) {
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

/** Keep `updatedAt` fresh during long Apify / media work so stale checks don't kill the job. */
async function withJobHeartbeat<T>(
  jobId: string,
  work: () => Promise<T>,
): Promise<T> {
  const beat = () => {
    void updateJob(jobId, {}).catch(() => {
      /* ignore heartbeat failures */
    });
  };
  beat();
  const timer = setInterval(beat, 25_000);
  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
}

/**
 * Concurrency-safe job start.
 * Wins if: still queued, just claimed (scraping+connecting), or stale active.
 * Losers return false so duplicate workers exit without double-processing.
 */
async function beginImportJob(jobId: string): Promise<boolean> {
  const stamp = now();

  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data: current } = await db
      .from("import_jobs")
      .select("id, status, stage, updated_at, created_at, retry_count, posts_limit")
      .eq("id", jobId)
      .maybeSingle();
    if (!current) return false;
    if (current.status === "completed" || current.status === "failed") {
      return false;
    }

    const staleMs = importStaleMs(
      typeof current.posts_limit === "number" ? current.posts_limit : undefined,
    );
    const updatedAt = Date.parse(
      (current.updated_at as string) || (current.created_at as string),
    );
    const isStale =
      Number.isFinite(updatedAt) && Date.now() - updatedAt >= staleMs;

    // Path A: queued → take ownership
    {
      const { data } = await db
        .from("import_jobs")
        .update({
          status: "scraping",
          stage: "reading_content",
          updated_at: stamp,
        })
        .eq("id", jobId)
        .eq("status", "queued")
        .select("id")
        .maybeSingle();
      if (data?.id) {
        logInfo("job.begin", { jobId, path: "queued" });
        return true;
      }
    }

    // Path B: claim_next left status=scraping stage=connecting — exclusive continue
    {
      const { data } = await db
        .from("import_jobs")
        .update({
          status: "scraping",
          stage: "reading_content",
          updated_at: stamp,
        })
        .eq("id", jobId)
        .eq("status", "scraping")
        .eq("stage", "connecting")
        .select("id")
        .maybeSingle();
      if (data?.id) {
        logInfo("job.begin", { jobId, path: "claimed" });
        return true;
      }
    }

    // Path C: stale active job — reclaim with retry bump
    if (isStale && isActiveStatus(current.status as ImportJob["status"])) {
      const nextRetry = (Number(current.retry_count) || 0) + 1;
      if (nextRetry > 3) {
        logWarn("job.begin_retry_exhausted", { jobId, retryCount: nextRetry });
        return false;
      }
      const { data } = await db
        .from("import_jobs")
        .update({
          status: "scraping",
          stage: "reading_content",
          retry_count: nextRetry,
          error_code: null,
          error_message: null,
          completed_at: null,
          updated_at: stamp,
        })
        .eq("id", jobId)
        .eq("status", current.status)
        .lt("updated_at", new Date(Date.now() - staleMs).toISOString())
        .select("id")
        .maybeSingle();
      if (data?.id) {
        logInfo("job.begin", { jobId, path: "stale", retryCount: nextRetry });
        return true;
      }
    }

    logInfo("job.begin_skip", { jobId, status: String(current.status) });
    return false;
  }

  let began = false;
  await writeStore((store) => {
    const job = store.jobs.find((item) => item.id === jobId);
    if (!job) return;
    if (job.status === "completed" || job.status === "failed") return;

    const staleMs = importStaleMs(job.postsLimit);
    const updatedAt = Date.parse(job.updatedAt || job.createdAt);
    const isStale =
      Number.isFinite(updatedAt) && Date.now() - updatedAt >= staleMs;

    if (job.status === "queued") {
      job.status = "scraping";
      job.stage = "reading_content";
      job.updatedAt = stamp;
      began = true;
      return;
    }

    if (job.status === "scraping" && job.stage === "connecting") {
      job.stage = "reading_content";
      job.updatedAt = stamp;
      began = true;
      return;
    }

    if (isStale && isActiveStatus(job.status)) {
      if (job.retryCount >= 3) return;
      job.status = "scraping";
      job.stage = "reading_content";
      job.retryCount += 1;
      job.errorCode = undefined;
      job.errorMessage = undefined;
      job.completedAt = undefined;
      job.updatedAt = stamp;
      began = true;
    }
  });
  if (began) logInfo("job.begin", { jobId, path: "memory" });
  return began;
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
  postsLimit?: number | string | null;
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

  const postsLimit = clampImportPosts(input.postsLimit, input.plan);

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
        postsLimit,
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
    postsLimit,
    startedAt: now(),
    createdAt: now(),
    updatedAt: now(),
  };

  await insertJob(job);

  logInfo("job.created", {
    jobId: job.id,
    workspaceId: job.workspaceId,
    username: job.username ?? undefined,
    postsLimit,
  });

  void recordProductEvent({
    eventName: "import_started",
    userId: job.userId,
    workspaceId: job.workspaceId,
    resourceType: "import_job",
    resourceId: job.id,
    metadata: { username: job.username, postsLimit },
  });
  void incrementDailyMetrics({ increments: { imports: 1 } });

  // Caller must schedule processImportJob via next/server `after()` so work
  // survives after the HTTP response (void fire-and-forget gets cancelled).
  return job;
}

export async function processImportJob(
  jobId: string,
  locale: Locale,
  postsLimitOverride?: number,
) {
  const store = await readStore();
  const job = store.jobs.find((item) => item.id === jobId);
  if (!job || !job.username) return;
  if (job.status === "completed" || job.status === "failed") return;

  const began = await beginImportJob(jobId);
  if (!began) return;

  logInfo("job.start", {
    jobId,
    workspaceId: job.workspaceId,
    username: job.username,
    collector: job.collector,
  });

  try {
    const collector = resolveCollector(job.username);
    const postsLimit =
      typeof postsLimitOverride === "number" && postsLimitOverride > 0
        ? Math.min(postsLimitOverride, IMPORT_POSTS_HARD_MAX)
        : typeof job.postsLimit === "number" && job.postsLimit > 0
          ? Math.min(job.postsLimit, IMPORT_POSTS_HARD_MAX)
          : clampImportPosts(undefined);

    // Profile + posts in parallel — Apify runs dominate wall time.
    logInfo("provider.start", { jobId, postsLimit });
    const [profile, posts] = await withJobHeartbeat(jobId, () =>
      Promise.all([
        collector.scrapeProfile(job.sourceUrl),
        collector.scrapePosts(job.sourceUrl, postsLimit),
      ]),
    );
    logInfo("provider.end", {
      jobId,
      posts: posts.length,
      private: profile.isPrivate,
    });

    if (profile.isPrivate) {
      throw new CollectorError("This profile is private.", "PRIVATE");
    }

    await updateJob(jobId, { status: "scraping", stage: "profile_found" });
    const imported = mergeInstagramData({
      workspaceId: job.workspaceId,
      sourceUrl: job.sourceUrl,
      profile,
      posts,
      requestedLimit: postsLimit,
      collector: job.collector,
    });

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
      if (existing >= 0) {
        // Keep stable id — (workspace_id, username) is unique in Supabase.
        const prev = draft.imports[existing]!;
        imported.id = prev.id;
        imported.createdAt = prev.createdAt;
        draft.imports[existing] = imported;
      } else {
        draft.imports.unshift(imported);
      }
    });

    // AI is optional — heuristic fallback keeps the product working without AI keys.
    await updateJob(jobId, { status: "analyzing", stage: "understanding_brand" });
    const mediaPromise = withJobHeartbeat(jobId, () => persistImportMedia(imported));
    let analysis;
    try {
      void recordAiUsage({
        feature: "import_analyze",
        status: "started",
        workspaceId: job.workspaceId,
        userId: job.userId,
        provider: process.env.AI_API_KEY ? "openai" : "mock",
        model: process.env.AI_MODEL ?? null,
      });
      const aiStarted = Date.now();
      analysis = await withJobHeartbeat(jobId, () =>
        getAIAnalyzer(job.username ?? "demo").analyzeImport({
          profile,
          posts,
          locale,
        }),
      );
      void recordAiUsage({
        feature: "import_analyze",
        status: "completed",
        workspaceId: job.workspaceId,
        userId: job.userId,
        provider: process.env.AI_API_KEY ? "openai" : "mock",
        model: process.env.AI_MODEL ?? null,
        latencyMs: Date.now() - aiStarted,
      });
    } catch (error) {
      void recordAiUsage({
        feature: "import_analyze",
        status: "failed",
        workspaceId: job.workspaceId,
        userId: job.userId,
        errorMessage:
          error instanceof Error ? error.message.slice(0, 200) : "ai_error",
      });
      logWarn("ai.failed_heuristic", {
        jobId,
        message: error instanceof Error ? error.message.slice(0, 120) : "ai_error",
      });
      analysis = heuristicAnalysisFromImport(imported, locale);
    }
    await mediaPromise;
    imported.aiAnalysis = analysis;

    await updateJob(jobId, { status: "generating", stage: "creating_website" });
    const config = buildWebsiteConfigFromInstagram({
      imported,
      analysis,
      locale,
    });

    const generatedWebsiteId = createId("web");
    const baseSlug = websiteSlug(analysis.businessName, imported.username);
    const existingForWorkspace = (await readStore()).websites.find(
      (item) =>
        item.workspaceId === job.workspaceId &&
        (item.slug === baseSlug ||
          item.slug.toLowerCase() === imported.username.toLowerCase() ||
          item.importId === imported.id),
    );
    const slug = await allocateUniqueSlug({
      base: baseSlug,
      workspaceId: job.workspaceId,
      websiteId: existingForWorkspace?.id,
    });

    // Final gate: never save a site that still hotlinks Instagram CDN.
    await withJobHeartbeat(jobId, () =>
      ensureWebsiteConfigMediaHosted(config, {
        slugHint: slug || imported.username,
        workspaceId: job.workspaceId,
      }),
    );
    imported.websiteConfig = config;

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
            item.id === existingForWorkspace?.id ||
            item.importId === imported.id),
      );
      if (existingSite >= 0) {
        const prev = draft.websites[existingSite]!;
        websiteId = prev.id;
        const nextVersion = prev.version + 1;
        const updatedAt = now();
        // Re-import refreshes content but must not unpublish a live site.
        draft.websites[existingSite] = {
          ...prev,
          importId: imported.id,
          slug,
          config,
          status: prev.status,
          publishedAt: prev.publishedAt,
          version: nextVersion,
          updatedAt,
        };
        draft.versions.push({
          id: createId("ver"),
          websiteId,
          version: nextVersion,
          config,
          createdAt: updatedAt,
        });
        logInfo("website.updated", {
          jobId,
          websiteId,
          version: nextVersion,
          status: prev.status,
        });
      } else {
        const createdAt = now();
        draft.websites.unshift({
          id: generatedWebsiteId,
          workspaceId: job.workspaceId,
          importId: imported.id,
          slug,
          config,
          status: "draft",
          version: 1,
          createdAt,
          updatedAt: createdAt,
          publishedAt: null,
        });
        draft.versions.push({
          id: createId("ver"),
          websiteId: generatedWebsiteId,
          version: 1,
          config,
          createdAt,
        });
        logInfo("website.created", {
          jobId,
          websiteId: generatedWebsiteId,
          version: 1,
        });
      }
    });

    await updateJob(jobId, {
      status: "completed",
      stage: "ready",
      importId: imported.id,
      websiteId,
      completedAt: now(),
      durationMs: computeJobDurationMs(job.startedAt, now()) ?? undefined,
    });
    logInfo("job.completed", { jobId, websiteId, importId: imported.id });
    void recordProductEvent({
      eventName: "import_completed",
      userId: job.userId,
      workspaceId: job.workspaceId,
      websiteId,
      resourceType: "import_job",
      resourceId: jobId,
    });
    void recordUsageEvent({
      feature: "instagram_imports",
      workspaceId: job.workspaceId,
      userId: job.userId,
      websiteId,
    });
    void incrementDailyMetrics({
      increments: { successful_imports: 1, websites_created: websiteId ? 1 : 0 },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "unknown";
    logError("job.failed", { jobId, message });
    const code =
      error instanceof InstagramUrlError
        ? error.code
        : error instanceof CollectorError
          ? error.code
          : error instanceof Error &&
              /APIFY_API_TOKEN is required/i.test(error.message)
            ? "PROVIDER_UNAVAILABLE"
            : error instanceof Error && /timeout|timed out|AbortError/i.test(error.message)
              ? "PROVIDER_TIMEOUT"
              : error instanceof Error && error.message.includes("MEDIA_PERSIST")
                ? "MEDIA_PERSIST_FAILED"
                : error instanceof Error && error.message.includes("AI")
                  ? "AI_FAILED"
                  : error instanceof Error &&
                      /duplicate|unique|23505/i.test(error.message)
                    ? "DATABASE_ERROR"
                    : "UNKNOWN";
    const mapped = publicError(code);
    const fresh = (await readStore()).jobs.find((item) => item.id === jobId);
    await updateJob(jobId, {
      status: "failed",
      errorCode: mapped.code,
      errorMessage: mapped.message,
      retryCount: (fresh?.retryCount ?? job.retryCount ?? 0) + 1,
      completedAt: now(),
      durationMs: computeJobDurationMs(job.startedAt, now()) ?? undefined,
    });
    void recordProductEvent({
      eventName: "import_failed",
      userId: job.userId,
      workspaceId: job.workspaceId,
      resourceType: "import_job",
      resourceId: jobId,
      metadata: { errorCode: mapped.code },
    });
    void incrementDailyMetrics({ increments: { failed_imports: 1 } });
    if (
      mapped.code === "PROVIDER_UNAVAILABLE" ||
      mapped.code === "PROVIDER_TIMEOUT" ||
      mapped.code === "DATABASE_ERROR"
    ) {
      void recordSystemEvent({
        eventName: "import_job_failure",
        severity: "warning",
        source: "import-job",
        errorCode: mapped.code,
        message: mapped.message,
        metadata: { jobId },
      });
    }
  }
}

export { STAGES };
