import type { AppStore } from "@/lib/database/store";
import { readBlobStore, writeBlobStore } from "@/lib/database/supabase-blob-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ImportJob } from "@/types/jobs";
import type { InstagramImport } from "@/types/instagram";
import type { User, Workspace } from "@/types/user";
import type { DomainRecord, WebsiteRecord, WebsiteVersion } from "@/types/website";

export type JobRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  source_url: string;
  username: string | null;
  status: ImportJob["status"];
  stage: ImportJob["stage"];
  collector: string;
  scrape_status: ImportJob["scrapeStatus"] | null;
  import_id: string | null;
  website_id: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  posts_imported: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ImportRow = {
  id: string;
  workspace_id: string;
  source_url: string;
  username: string;
  scrape_status: string;
  collector: string;
  data: InstagramImport | Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type WebsiteRow = {
  id: string;
  workspace_id: string;
  import_id: string | null;
  slug: string;
  config: WebsiteRecord["config"];
  status: WebsiteRecord["status"];
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DomainRow = {
  id: string;
  website_id: string;
  host: string;
  created_at: string;
};

let schemaReadyCache: boolean | null = null;

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    /Could not find the table|schema cache|relation .* does not exist/i.test(
      error.message ?? "",
    )
  );
}

/** True when `supabase/schema.sql` has been applied. */
export async function isSupabaseSchemaReady() {
  if (schemaReadyCache !== null) return schemaReadyCache;
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from("workspaces").select("id").limit(1);
    if (!error) {
      schemaReadyCache = true;
      return true;
    }
    if (isMissingRelation(error)) {
      schemaReadyCache = false;
      return false;
    }
    // Transient / misconfig — don't kill auth; fall back to file store.
    console.warn("[supabase] schema probe failed:", error.message);
    return false;
  } catch (error) {
    console.warn(
      "[supabase] schema probe error:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export function resetSupabaseSchemaCache() {
  schemaReadyCache = null;
}

function mapUser(row: {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

function mapWorkspace(row: {
  id: string;
  owner_id: string;
  name: string;
  plan: string;
  created_at: string;
}): Workspace {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    plan: row.plan === "pro" ? "pro" : "free",
    createdAt: row.created_at,
  };
}

export function mapJob(row: JobRow): ImportJob {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    sourceUrl: row.source_url,
    username: row.username,
    status: row.status,
    stage: row.stage,
    collector: row.collector,
    scrapeStatus: row.scrape_status ?? undefined,
    importId: row.import_id ?? undefined,
    websiteId: row.website_id ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    retryCount: row.retry_count,
    postsImported: row.posts_imported,
    startedAt: row.started_at ?? row.created_at,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapImport(row: ImportRow): InstagramImport {
  const data = (row.data ?? {}) as Partial<InstagramImport>;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceUrl: row.source_url,
    username: row.username,
    scrapeStatus: row.scrape_status as InstagramImport["scrapeStatus"],
    collector: row.collector,
    profile: data.profile as InstagramImport["profile"],
    posts: data.posts ?? [],
    reels: data.reels ?? [],
    media: data.media ?? [],
    aiAnalysis: data.aiAnalysis,
    websiteConfig: data.websiteConfig,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapWebsiteRow(row: WebsiteRow): WebsiteRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    importId: row.import_id ?? "",
    slug: row.slug,
    config: row.config,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

export function mapDomainRow(row: DomainRow): DomainRecord {
  return {
    id: row.id,
    websiteId: row.website_id,
    host: row.host,
    createdAt: row.created_at,
  };
}

function mapWebsite(row: WebsiteRow): WebsiteRecord {
  return mapWebsiteRow(row);
}

async function readTableStore(): Promise<AppStore> {
  const db = getSupabaseAdmin();

  const [profiles, workspaces, jobs, imports, websites, versions, domains] =
    await Promise.all([
      db.from("profiles").select("*"),
      db.from("workspaces").select("*"),
      db.from("import_jobs").select("*").order("created_at", { ascending: false }),
      db.from("instagram_imports").select("*").order("updated_at", { ascending: false }),
      db.from("websites").select("*").order("updated_at", { ascending: false }),
      db.from("website_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      db.from("domains").select("*").order("created_at", { ascending: false }),
    ]);

  const errors = [
    profiles.error,
    workspaces.error,
    jobs.error,
    imports.error,
    websites.error,
    versions.error,
  ].filter(Boolean);
  if (errors.length) {
    throw new Error(errors.map((e) => e!.message).join("; "));
  }

  return {
    users: (profiles.data ?? []).map((row) =>
      mapUser(
        row as {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
        },
      ),
    ),
    workspaces: (workspaces.data ?? []).map((row) =>
      mapWorkspace(
        row as {
          id: string;
          owner_id: string;
          name: string;
          plan: string;
          created_at: string;
        },
      ),
    ),
    jobs: (jobs.data ?? []).map((row) => mapJob(row as JobRow)),
    imports: (imports.data ?? []).map((row) => mapImport(row as ImportRow)),
    websites: (websites.data ?? []).map((row) => mapWebsite(row as WebsiteRow)),
    versions: (versions.data ?? []).map((row) => ({
      id: row.id as string,
      websiteId: row.website_id as string,
      version: row.version as number,
      config: row.config as WebsiteVersion["config"],
      createdAt: row.created_at as string,
    })),
    domains: domains.error
      ? []
      : (domains.data ?? []).map(
          (row): DomainRecord => ({
            id: row.id as string,
            websiteId: row.website_id as string,
            host: row.host as string,
            createdAt: row.created_at as string,
          }),
        ),
  };
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

function importToRow(item: InstagramImport): Record<string, unknown> {
  return {
    id: item.id,
    workspace_id: item.workspaceId,
    source_url: item.sourceUrl,
    username: item.username,
    scrape_status: item.scrapeStatus,
    collector: item.collector,
    data: item,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function websiteToRow(site: WebsiteRecord): Record<string, unknown> {
  return {
    id: site.id,
    workspace_id: site.workspaceId,
    import_id: site.importId || null,
    slug: site.slug,
    config: site.config,
    status: site.status,
    version: site.version,
    published_at: site.publishedAt,
    created_at: site.createdAt,
    updated_at: site.updatedAt,
  };
}

function ids(list: { id: string }[]) {
  return new Set(list.map((item) => item.id));
}

/**
 * Upsert-only sync. Never deletes "missing" rows from a full-table snapshot —
 * that race used to resurrect/delete concurrent users' data.
 * Explicit deletes go through dedicated helpers.
 */
async function upsertChanged<T extends { id: string }>(
  table: string,
  before: T[],
  after: T[],
  toRow: (item: T) => Record<string, unknown>,
) {
  const db = getSupabaseAdmin();
  const beforeMap = new Map(before.map((item) => [item.id, item]));
  const changed = after.filter((item) => {
    const prev = beforeMap.get(item.id);
    if (!prev) return true;
    return JSON.stringify(toRow(prev)) !== JSON.stringify(toRow(item));
  });
  if (!changed.length) return;
  const { error } = await db.from(table).upsert(changed.map(toRow), {
    onConflict: "id",
  });
  if (error) throw error;
}

export async function deleteDomainRows(idsToDelete: string[]) {
  if (!idsToDelete.length) return;
  const db = getSupabaseAdmin();
  const { error } = await db.from("domains").delete().in("id", idsToDelete);
  if (error) throw error;
}

export async function trimWebsiteVersions(websiteId: string, keep: number) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("website_versions")
    .select("id, version")
    .eq("website_id", websiteId)
    .order("version", { ascending: false });
  if (error || !data) return;
  const drop = data.slice(keep).map((row) => row.id as string);
  if (!drop.length) return;
  await db.from("website_versions").delete().in("id", drop);
}

async function writeTableStore(before: AppStore, after: AppStore) {
  const db = getSupabaseAdmin();
  const beforeUsers = new Map(before.users.map((u) => [u.id, u]));
  const usersChanged = after.users.filter((user) => {
    const prev = beforeUsers.get(user.id);
    if (!prev) return true;
    return (
      prev.email !== user.email ||
      prev.name !== user.name ||
      prev.avatarUrl !== user.avatarUrl
    );
  });
  if (usersChanged.length) {
    const { error } = await db.from("profiles").upsert(
      usersChanged.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatarUrl,
        created_at: user.createdAt,
      })),
      { onConflict: "id" },
    );
    if (error) throw error;
  }

  await upsertChanged("workspaces", before.workspaces, after.workspaces, (ws) => ({
    id: ws.id,
    owner_id: ws.ownerId,
    name: ws.name,
    plan: ws.plan,
    created_at: ws.createdAt,
  }));

  await upsertChanged(
    "instagram_imports",
    before.imports,
    after.imports,
    importToRow,
  );
  await upsertChanged("websites", before.websites, after.websites, websiteToRow);
  await upsertChanged("import_jobs", before.jobs, after.jobs, jobToRow);
  await upsertChanged(
    "website_versions",
    before.versions,
    after.versions,
    (version) => ({
      id: version.id,
      website_id: version.websiteId,
      version: version.version,
      config: version.config,
      created_at: version.createdAt,
    }),
  );

  const beforeDomains = before.domains ?? [];
  const afterDomains = after.domains ?? [];
  const afterIds = ids(afterDomains);
  const removedDomains = beforeDomains
    .filter((d) => !afterIds.has(d.id))
    .map((d) => d.id);
  if (removedDomains.length) {
    await deleteDomainRows(removedDomains).catch(() => undefined);
  }
  await upsertChanged("domains", beforeDomains, afterDomains, (domain) => ({
    id: domain.id,
    website_id: domain.websiteId,
    host: domain.host,
    created_at: domain.createdAt,
  })).catch(() => {
    // domains table may be absent in older projects
  });

  // Cap versions for websites that received a new version in this write
  const touched = new Set<string>();
  for (const v of after.versions) {
    const prev = before.versions.find((x) => x.id === v.id);
    if (!prev) touched.add(v.websiteId);
  }
  for (const websiteId of touched) {
    await trimWebsiteVersions(websiteId, 30).catch(() => undefined);
  }
}

export async function readSupabaseStore(): Promise<AppStore> {
  if (await isSupabaseSchemaReady()) {
    return readTableStore();
  }
  return readBlobStore();
}

export async function writeSupabaseStore(before: AppStore, after: AppStore) {
  if (await isSupabaseSchemaReady()) {
    await writeTableStore(before, after);
    return;
  }
  await writeBlobStore(after);
}
