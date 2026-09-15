import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/lib/admin/rbac";
import type { AdminPermission } from "@/lib/admin/permissions";
import {
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/admin/dates";
import {
  assessWebsiteHealth,
  assessWorkspaceHealth,
  type HealthAssessment,
} from "@/lib/admin/health";
import { getWorkspaceEntitlements, normalizePlanId } from "@/lib/admin/entitlements";
import type { MetricResult } from "@/lib/admin/contracts";

async function authorize(userId: string, permission: AdminPermission) {
  return requireAdminPermission(userId, permission);
}

function unavailable<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "unavailable", reason, source };
}

function available<T>(value: T, source: string): MetricResult<T> {
  return { status: "available", value, source };
}

function partial<T>(value: T, source: string, warning: string): MetricResult<T> {
  return { status: "partial", value, source, warning };
}

/**
 * Convert a PostgREST head-count response into a MetricResult.
 * A failed query or missing count is `unavailable`, never a silent zero.
 */
function countMetric(
  res: { count: number | null; error: { message: string } | null },
  source: string,
): MetricResult<number> {
  if (res.error) return unavailable("Count query failed", source);
  if (res.count == null) return unavailable("Count not returned", source);
  return available(res.count, source);
}

/** Strip PostgREST / ilike special characters from user search input. */
function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/[%_,)(]/g, "").trim();
}

/** More aggressive sanitize for global search (also strips dots / commas). */
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%_,)(.]/g, "").trim();
}

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  workspaceId: string | null;
  workspaceName: string | null;
  plan: string | null;
  websiteCount: number;
  publishedCount: number;
  importCount: number;
  /** null = AI sample truncated for this page; count would be a silent lower bound. */
  aiRequestCount: number | null;
  health: HealthAssessment | null;
};

export type AdminUserMetricsBundle = {
  totalUsers: MetricResult<number>;
  newUsers: MetricResult<number>;
  withWorkspace: MetricResult<number>;
  withWebsite: MetricResult<number>;
  publishedUsers: MetricResult<number>;
  planDistribution: MetricResult<Record<string, number>>;
  lastActivity: MetricResult<number>;
};

export async function getAdminUsersEnriched(input: {
  userId: string;
  preset?: DateRangePreset;
  limit?: number;
  q?: string;
}): Promise<{ metrics: AdminUserMetricsBundle; rows: AdminUserListItem[] }> {
  await authorize(input.userId, "users.read");
  const limit = Math.min(input.limit ?? 100, 200);
  const range = resolveDateRange({ preset: input.preset ?? "30d" });

  const lastActivity = unavailable<number>(
    "Last activity requires reliable session/product activity instrumentation",
    "product_events",
  );

  if (!supabaseConfigured()) {
    return {
      metrics: {
        totalUsers: unavailable("Supabase not configured"),
        newUsers: unavailable("Supabase not configured"),
        withWorkspace: unavailable("Supabase not configured"),
        withWebsite: unavailable("Supabase not configured"),
        publishedUsers: unavailable("Supabase not configured"),
        planDistribution: unavailable("Supabase not configured"),
        lastActivity,
      },
      rows: [],
    };
  }

  const db = getSupabaseAdmin();
  const qRaw = input.q?.trim() ?? "";
  const qSafe = qRaw ? sanitizeIlikeTerm(qRaw) : "";
  const like = qSafe ? `%${qSafe}%` : null;

  // Exact head counts + plan sample + website sample for secondary metrics
  const [
    totalRes,
    newUsersRes,
    wsCountRes,
    planRes,
    siteSampleRes,
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", range.start)
      .lt("created_at", range.end),
    db
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    db
      .from("workspaces")
      .select("plan")
      .is("deleted_at", null)
      .limit(2000),
    db
      .from("websites")
      .select("workspace_id, status")
      .is("deleted_at", null)
      .limit(5000),
  ]);

  let profilesQuery = db
    .from("profiles")
    .select("id, email, name, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (like) {
    profilesQuery = profilesQuery.or(
      `email.ilike."${like}",name.ilike."${like}"`,
    );
  }

  const profilesRes = await profilesQuery;
  const profiles = profilesRes.data ?? [];
  const profileIds = profiles.map((p) => p.id as string);

  type WsRow = {
    id: string;
    owner_id: string;
    name: string;
    plan: string | null;
  };
  type SiteRow = { id: string; workspace_id: string; status: string };
  type ImportRow = { id: string; workspace_id: string };
  type JobRow = { id: string; workspace_id: string };
  type DomainRow = { id: string; website_id: string };
  type AiRow = { id: string; user_id: string | null };

  let workspaces: WsRow[] = [];
  let websites: SiteRow[] = [];
  let imports: ImportRow[] = [];
  let failedJobs: JobRow[] = [];
  let domains: DomainRow[] = [];
  let aiLogs: AiRow[] = [];
  const AI_SAMPLE_CAP = 2000;
  let aiSampleReliable = true;

  if (profileIds.length > 0) {
    const wsRes = await db
      .from("workspaces")
      .select("id, owner_id, name, plan")
      .in("owner_id", profileIds)
      .is("deleted_at", null);
    workspaces = (wsRes.data ?? []) as WsRow[];
    const workspaceIds = workspaces.map((w) => w.id);

    if (workspaceIds.length > 0) {
      const [sitesRes, importsRes, jobsRes] = await Promise.all([
        db
          .from("websites")
          .select("id, workspace_id, status")
          .in("workspace_id", workspaceIds)
          .is("deleted_at", null),
        db
          .from("instagram_imports")
          .select("id, workspace_id")
          .in("workspace_id", workspaceIds),
        db
          .from("import_jobs")
          .select("id, workspace_id")
          .in("workspace_id", workspaceIds)
          .eq("status", "failed")
          .limit(2000),
      ]);
      websites = (sitesRes.data ?? []) as SiteRow[];
      imports = (importsRes.data ?? []) as ImportRow[];
      failedJobs = (jobsRes.data ?? []) as JobRow[];

      const websiteIds = websites.map((s) => s.id);
      if (websiteIds.length > 0) {
        const domainsRes = await db
          .from("domains")
          .select("id, website_id")
          .in("website_id", websiteIds);
        domains = (domainsRes.data ?? []) as DomainRow[];
      }
    }

    const aiRes = await db
      .from("ai_usage_logs")
      .select("id, user_id")
      .in("user_id", profileIds)
      .limit(AI_SAMPLE_CAP);
    aiLogs = (aiRes.data ?? []) as AiRow[];
    aiSampleReliable = !aiRes.error && aiLogs.length < AI_SAMPLE_CAP;
  }

  const wsByOwner = new Map<string, WsRow>();
  for (const ws of workspaces) {
    if (!wsByOwner.has(ws.owner_id)) {
      wsByOwner.set(ws.owner_id, ws);
    }
  }

  const sitesByWs = new Map<string, SiteRow[]>();
  for (const site of websites) {
    const list = sitesByWs.get(site.workspace_id) ?? [];
    list.push(site);
    sitesByWs.set(site.workspace_id, list);
  }

  const importsByWs = new Map<string, number>();
  for (const item of imports) {
    importsByWs.set(
      item.workspace_id,
      (importsByWs.get(item.workspace_id) ?? 0) + 1,
    );
  }

  const failedByWs = new Map<string, number>();
  for (const job of failedJobs) {
    failedByWs.set(
      job.workspace_id,
      (failedByWs.get(job.workspace_id) ?? 0) + 1,
    );
  }

  const siteIdToWs = new Map(websites.map((s) => [s.id, s.workspace_id]));
  const domainByWs = new Map<string, number>();
  for (const d of domains) {
    const wid = siteIdToWs.get(d.website_id);
    if (!wid) continue;
    domainByWs.set(wid, (domainByWs.get(wid) ?? 0) + 1);
  }

  const aiByUser = new Map<string, number>();
  for (const log of aiLogs) {
    if (!log.user_id) continue;
    aiByUser.set(log.user_id, (aiByUser.get(log.user_id) ?? 0) + 1);
  }

  const rows: AdminUserListItem[] = profiles.map((p) => {
    const id = p.id as string;
    const ws = wsByOwner.get(id) ?? null;
    const sites = ws ? sitesByWs.get(ws.id) ?? [] : [];
    const published = sites.filter((s) => s.status === "published").length;
    const health = ws
      ? assessWorkspaceHealth({
          websiteCount: sites.length,
          publishedCount: published,
          failedImportJobs: failedByWs.get(ws.id) ?? 0,
          successfulImports: importsByWs.get(ws.id) ?? 0,
          domainCount: domainByWs.get(ws.id) ?? 0,
          plan: String(ws.plan ?? "free"),
        })
      : null;

    return {
      id,
      email: (p.email as string) ?? "",
      name: (p.name as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      createdAt: p.created_at as string,
      workspaceId: ws ? ws.id : null,
      workspaceName: ws ? ws.name : null,
      plan: ws ? normalizePlanId(String(ws.plan)) : null,
      websiteCount: sites.length,
      publishedCount: published,
      importCount: ws ? importsByWs.get(ws.id) ?? 0 : 0,
      // Never show a silent lower bound: null when the page sample was truncated.
      aiRequestCount: aiSampleReliable ? (aiByUser.get(id) ?? 0) : null,
      health,
    };
  });

  const planRows = planRes.data ?? [];
  const planDist: Record<string, number> = {};
  for (const ws of planRows) {
    const plan = normalizePlanId(String(ws.plan));
    planDist[plan] = (planDist[plan] ?? 0) + 1;
  }
  const planDistribution: MetricResult<Record<string, number>> =
    planRows.length === 2000
      ? partial(planDist, "workspaces.plan", "Plan sample truncated at 2000 rows")
      : available(planDist, "workspaces.plan");

  const siteSample = siteSampleRes.data ?? [];
  const wsWithSite = new Set<string>();
  const wsPublished = new Set<string>();
  for (const s of siteSample) {
    const wid = s.workspace_id as string;
    wsWithSite.add(wid);
    if (s.status === "published") wsPublished.add(wid);
  }
  const siteSamplePartial = siteSample.length === 5000;
  const withWebsite: MetricResult<number> = siteSamplePartial
    ? partial(
        wsWithSite.size,
        "websites.workspace_id",
        "Website sample truncated at 5000 rows",
      )
    : available(wsWithSite.size, "websites.workspace_id");
  const publishedUsers: MetricResult<number> = siteSamplePartial
    ? partial(
        wsPublished.size,
        "websites.status",
        "Website sample truncated at 5000 rows",
      )
    : available(wsPublished.size, "websites.status");

  return {
    metrics: {
      totalUsers: countMetric(totalRes, "profiles"),
      newUsers: countMetric(newUsersRes, "profiles.created_at"),
      withWorkspace: countMetric(wsCountRes, "workspaces"),
      withWebsite,
      publishedUsers,
      planDistribution,
      lastActivity,
    },
    rows,
  };
}

export type AdminUser360 = {
  user: AdminUserListItem;
  entitlements: ReturnType<typeof getWorkspaceEntitlements> | null;
  notes: Array<{ id: string; body: string; createdAt: string; authorUserId: string | null }>;
  /** Non-null when notes could not be loaded (e.g. Phase 3 migration missing). */
  notesUnavailableReason: string | null;
  recentActivity: Array<{
    id: string;
    kind: string;
    action: string;
    occurredAt: string;
  }>;
  websites: Array<{
    id: string;
    slug: string;
    status: string;
    updatedAt: string;
  }>;
};

export async function getAdminUser360(input: {
  userId: string;
  targetUserId: string;
}): Promise<AdminUser360 | null> {
  await authorize(input.userId, "users.read");
  if (!supabaseConfigured()) return null;

  const db = getSupabaseAdmin();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, email, name, avatar_url, created_at")
    .eq("id", input.targetUserId)
    .maybeSingle();
  if (profileError || !profile) return null;

  const { data: workspace } = await db
    .from("workspaces")
    .select("id, owner_id, name, plan")
    .eq("owner_id", input.targetUserId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const workspaceId = workspace ? (workspace.id as string) : null;

  const [notesRes, eventsRes, sitesRes, importsRes, jobsRes, aiRes] =
    await Promise.all([
      db
        .from("admin_support_notes")
        .select("id, body, created_at, author_user_id")
        .eq("target_user_id", input.targetUserId)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("product_events")
        .select("id, event_name, occurred_at")
        .eq("user_id", input.targetUserId)
        .order("occurred_at", { ascending: false })
        .limit(30),
      workspaceId
        ? db
            .from("websites")
            .select("id, slug, status, updated_at")
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("updated_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as unknown[], error: null }),
      workspaceId
        ? db
            .from("instagram_imports")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
        : Promise.resolve({ count: 0, error: null }),
      workspaceId
        ? db
            .from("import_jobs")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .eq("status", "failed")
        : Promise.resolve({ count: 0, error: null }),
      db
        .from("ai_usage_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", input.targetUserId),
    ]);

  const sites = (sitesRes.data ?? []) as Array<{
    id: string;
    slug: string;
    status: string;
    updated_at: string;
  }>;
  const published = sites.filter((s) => s.status === "published").length;

  let domainCount = 0;
  if (sites.length > 0) {
    const { count } = await db
      .from("domains")
      .select("id", { count: "exact", head: true })
      .in(
        "website_id",
        sites.map((s) => s.id),
      );
    domainCount = count ?? 0;
  }

  const plan = workspace ? normalizePlanId(String(workspace.plan)) : null;
  const importCount = importsRes.count ?? 0;
  const failedImportJobs = jobsRes.count ?? 0;

  const user: AdminUserListItem = {
    id: profile.id as string,
    email: (profile.email as string) ?? "",
    name: (profile.name as string | null) ?? null,
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    createdAt: profile.created_at as string,
    workspaceId,
    workspaceName: workspace ? (workspace.name as string) : null,
    plan,
    websiteCount: sites.length,
    publishedCount: published,
    importCount,
    aiRequestCount: aiRes.error ? null : (aiRes.count ?? 0),
    health: workspace
      ? assessWorkspaceHealth({
          websiteCount: sites.length,
          publishedCount: published,
          failedImportJobs,
          successfulImports: importCount,
          domainCount,
          plan: String(workspace.plan ?? "free"),
        })
      : null,
  };

  return {
    user,
    entitlements: plan ? getWorkspaceEntitlements(plan) : null,
    notes: (notesRes.data ?? []).map((n) => ({
      id: n.id as string,
      body: n.body as string,
      createdAt: n.created_at as string,
      authorUserId: (n.author_user_id as string | null) ?? null,
    })),
    notesUnavailableReason: notesRes.error
      ? isMissingRelation(notesRes.error)
        ? "admin_support_notes table missing — apply migration 20260916010000_admin_phase3.sql"
        : `Notes query failed (${notesRes.error.code ?? "unknown"})`
      : null,
    recentActivity: (eventsRes.data ?? []).map((e) => ({
      id: e.id as string,
      kind: "product",
      action: e.event_name as string,
      occurredAt: e.occurred_at as string,
    })),
    websites: sites.map((s) => ({
      id: s.id,
      slug: s.slug,
      status: s.status,
      updatedAt: s.updated_at,
    })),
  };
}

export type AdminWorkspaceListItem = {
  id: string;
  name: string;
  ownerId: string;
  plan: string;
  createdAt: string;
  websiteCount: number;
  publishedCount: number;
  importCount: number;
  domainCount: number;
  orderCount: number;
  health: HealthAssessment;
};

export async function getAdminWorkspacesEnriched(input: {
  userId: string;
  limit?: number;
}): Promise<{
  metrics: {
    total: MetricResult<number>;
    withWebsites: MetricResult<number>;
    published: MetricResult<number>;
    planDistribution: MetricResult<Record<string, number>>;
  };
  rows: AdminWorkspaceListItem[];
}> {
  await authorize(input.userId, "workspaces.read");
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      metrics: {
        total: empty,
        withWebsites: empty,
        published: empty,
        planDistribution: unavailable("Supabase not configured"),
      },
      rows: [],
    };
  }

  const db = getSupabaseAdmin();
  const limit = Math.min(input.limit ?? 100, 200);

  const [totalRes, wsRes, siteSampleRes, planRes] = await Promise.all([
    db
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    db
      .from("workspaces")
      .select("id, owner_id, name, plan, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    db
      .from("websites")
      .select("workspace_id, status")
      .is("deleted_at", null)
      .limit(5000),
    db
      .from("workspaces")
      .select("plan")
      .is("deleted_at", null)
      .limit(2000),
  ]);

  const workspaces = wsRes.data ?? [];
  const workspaceIds = workspaces.map((w) => w.id as string);

  type SiteRow = { id: string; workspace_id: string; status: string };
  let websites: SiteRow[] = [];
  let imports: Array<{ id: string; workspace_id: string }> = [];
  let orders: Array<{ id: string; workspace_id: string }> = [];
  let failedJobs: Array<{ id: string; workspace_id: string }> = [];
  let domains: Array<{ id: string; website_id: string }> = [];

  if (workspaceIds.length > 0) {
    const [sitesRes, importsRes, ordersRes, jobsRes] = await Promise.all([
      db
        .from("websites")
        .select("id, workspace_id, status")
        .in("workspace_id", workspaceIds)
        .is("deleted_at", null),
      db
        .from("instagram_imports")
        .select("id, workspace_id")
        .in("workspace_id", workspaceIds),
      db
        .from("store_orders")
        .select("id, workspace_id")
        .in("workspace_id", workspaceIds),
      db
        .from("import_jobs")
        .select("id, workspace_id")
        .in("workspace_id", workspaceIds)
        .eq("status", "failed")
        .limit(2000),
    ]);
    websites = (sitesRes.data ?? []) as SiteRow[];
    imports = importsRes.data ?? [];
    orders = ordersRes.data ?? [];
    failedJobs = jobsRes.data ?? [];

    const websiteIds = websites.map((s) => s.id);
    if (websiteIds.length > 0) {
      const domainsRes = await db
        .from("domains")
        .select("id, website_id")
        .in("website_id", websiteIds);
      domains = domainsRes.data ?? [];
    }
  }

  const siteIdToWs = new Map(websites.map((s) => [s.id, s.workspace_id]));
  const domainByWs = new Map<string, number>();
  for (const d of domains) {
    const wid = siteIdToWs.get(d.website_id);
    if (!wid) continue;
    domainByWs.set(wid, (domainByWs.get(wid) ?? 0) + 1);
  }

  const sitesByWs = new Map<string, SiteRow[]>();
  for (const site of websites) {
    const list = sitesByWs.get(site.workspace_id) ?? [];
    list.push(site);
    sitesByWs.set(site.workspace_id, list);
  }

  const importsByWs = new Map<string, number>();
  for (const item of imports) {
    importsByWs.set(
      item.workspace_id,
      (importsByWs.get(item.workspace_id) ?? 0) + 1,
    );
  }
  const ordersByWs = new Map<string, number>();
  for (const item of orders) {
    ordersByWs.set(
      item.workspace_id,
      (ordersByWs.get(item.workspace_id) ?? 0) + 1,
    );
  }
  const failedByWs = new Map<string, number>();
  for (const job of failedJobs) {
    failedByWs.set(
      job.workspace_id,
      (failedByWs.get(job.workspace_id) ?? 0) + 1,
    );
  }

  const rows: AdminWorkspaceListItem[] = workspaces.map((ws) => {
    const wid = ws.id as string;
    const sites = sitesByWs.get(wid) ?? [];
    const published = sites.filter((s) => s.status === "published").length;
    const importCount = importsByWs.get(wid) ?? 0;
    const orderCount = ordersByWs.get(wid) ?? 0;
    const failedJobCount = failedByWs.get(wid) ?? 0;
    const health = assessWorkspaceHealth({
      websiteCount: sites.length,
      publishedCount: published,
      failedImportJobs: failedJobCount,
      successfulImports: importCount,
      domainCount: domainByWs.get(wid) ?? 0,
      plan: String(ws.plan ?? "free"),
    });
    return {
      id: wid,
      name: (ws.name as string) ?? "",
      ownerId: ws.owner_id as string,
      plan: normalizePlanId(String(ws.plan)),
      createdAt: ws.created_at as string,
      websiteCount: sites.length,
      publishedCount: published,
      importCount,
      domainCount: domainByWs.get(wid) ?? 0,
      orderCount,
      health,
    };
  });

  const planRows = planRes.data ?? [];
  const planDist: Record<string, number> = {};
  for (const w of planRows) {
    const plan = normalizePlanId(String(w.plan));
    planDist[plan] = (planDist[plan] ?? 0) + 1;
  }

  const siteSample = siteSampleRes.data ?? [];
  const wsWithSite = new Set<string>();
  const wsPublished = new Set<string>();
  for (const s of siteSample) {
    const wid = s.workspace_id as string;
    wsWithSite.add(wid);
    if (s.status === "published") wsPublished.add(wid);
  }
  const sitePartial = siteSample.length === 5000;

  return {
    metrics: {
      total: countMetric(totalRes, "workspaces"),
      withWebsites: sitePartial
        ? partial(
            wsWithSite.size,
            "websites.workspace_id",
            "Website sample truncated at 5000 rows",
          )
        : available(wsWithSite.size, "websites.workspace_id"),
      published: sitePartial
        ? partial(
            wsPublished.size,
            "websites.status",
            "Website sample truncated at 5000 rows",
          )
        : available(wsPublished.size, "websites.status"),
      planDistribution:
        planRows.length === 2000
          ? partial(
              planDist,
              "workspaces.plan",
              "Plan sample truncated at 2000 rows",
            )
          : available(planDist, "workspaces.plan"),
    },
    rows,
  };
}

export type AdminWebsiteListItem = {
  id: string;
  slug: string;
  status: string;
  workspaceId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  domainHost: string | null;
  pageViews: number | null;
  health: HealthAssessment;
};

export async function getAdminWebsitesEnriched(input: {
  userId: string;
  limit?: number;
}): Promise<{
  metrics: {
    total: MetricResult<number>;
    published: MetricResult<number>;
    unpublished: MetricResult<number>;
    withDomain: MetricResult<number>;
  };
  rows: AdminWebsiteListItem[];
}> {
  await authorize(input.userId, "websites.read");
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      metrics: {
        total: empty,
        published: empty,
        unpublished: empty,
        withDomain: empty,
      },
      rows: [],
    };
  }

  const db = getSupabaseAdmin();
  const limit = Math.min(input.limit ?? 100, 200);

  const [totalRes, publishedRes, unpublishedRes, domainRes, sitesRes] =
    await Promise.all([
      db
        .from("websites")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      db
        .from("websites")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "published"),
      db
        .from("websites")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .neq("status", "published"),
      db.from("domains").select("id", { count: "exact", head: true }),
      db
        .from("websites")
        .select(
          "id, workspace_id, slug, status, version, created_at, updated_at, published_at",
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(limit),
    ]);

  const sites = sitesRes.data ?? [];
  const pageIds = sites.map((s) => s.id as string);

  const domainBySite = new Map<string, string>();
  const viewsBySite = new Map<string, number>();
  let pageViewsReliable = true;

  if (pageIds.length > 0) {
    const [domainsRes, viewsRes] = await Promise.all([
      db
        .from("domains")
        .select("id, website_id, host")
        .in("website_id", pageIds),
      db
        .from("page_views")
        .select("website_id")
        .in("website_id", pageIds)
        .limit(5000),
    ]);

    for (const d of domainsRes.data ?? []) {
      if (!domainBySite.has(d.website_id as string)) {
        domainBySite.set(d.website_id as string, d.host as string);
      }
    }

    const viewRows = viewsRes.data ?? [];
    if (viewsRes.error || viewRows.length === 5000) {
      pageViewsReliable = false;
    } else {
      for (const v of viewRows) {
        const sid = v.website_id as string;
        viewsBySite.set(sid, (viewsBySite.get(sid) ?? 0) + 1);
      }
    }
  }

  const rows: AdminWebsiteListItem[] = sites.map((s) => {
    const id = s.id as string;
    const host = domainBySite.get(id) ?? null;
    return {
      id,
      slug: s.slug as string,
      status: s.status as string,
      workspaceId: s.workspace_id as string,
      version: Number(s.version ?? 0),
      createdAt: s.created_at as string,
      updatedAt: s.updated_at as string,
      publishedAt: (s.published_at as string | null) ?? null,
      domainHost: host,
      pageViews: pageViewsReliable ? (viewsBySite.get(id) ?? 0) : null,
      health: assessWebsiteHealth({
        status: s.status as string,
        hasDomain: Boolean(host),
        publishedAt: (s.published_at as string | null) ?? null,
        updatedAt: s.updated_at as string,
      }),
    };
  });

  return {
    metrics: {
      total: countMetric(totalRes, "websites"),
      published: countMetric(publishedRes, "websites.status"),
      unpublished: countMetric(unpublishedRes, "websites.status"),
      withDomain: countMetric(domainRes, "domains"),
    },
    rows,
  };
}

export async function getAdminDomainsList(input: {
  userId: string;
  limit?: number;
}) {
  await authorize(input.userId, "websites.read");
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("domains")
    .select(
      "id, website_id, host, created_at, websites!inner(slug, workspace_id, status, deleted_at)",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(input.limit ?? 100, 200));

  return (data ?? [])
    .map((row) => {
      const site = row.websites as unknown as {
        slug: string;
        workspace_id: string;
        status: string;
        deleted_at: string | null;
      };
      return { row, site };
    })
    .filter(({ site }) => site.deleted_at == null)
    .map(({ row, site }) => ({
      id: row.id as string,
      host: row.host as string,
      websiteId: row.website_id as string,
      websiteSlug: site.slug,
      workspaceId: site.workspace_id,
      websiteStatus: site.status,
      createdAt: row.created_at as string,
      health: site.status === "published" ? "connected" : "unknown",
    }));
}

export async function getAdminMediaList(input: {
  userId: string;
  limit?: number;
}) {
  await authorize(input.userId, "workspaces.read");
  if (!supabaseConfigured()) {
    return {
      metrics: {
        assetCount: unavailable<number>("Supabase not configured"),
        storageBytes: unavailable<number>(
          "Storage byte totals require provider metering",
          "media_assets",
        ),
      },
      rows: [] as Array<{
        id: string;
        workspaceId: string;
        type: string;
        publicUrl: string | null;
        createdAt: string;
      }>,
    };
  }
  const db = getSupabaseAdmin();
  const { data, count } = await db
    .from("media_assets")
    .select("id, workspace_id, type, public_url, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(Math.min(input.limit ?? 100, 200));

  return {
    metrics: {
      assetCount: available(count ?? (data ?? []).length, "media_assets"),
      storageBytes: unavailable<number>(
        "Byte-level storage usage not stored on media_assets rows",
        "media_assets",
      ),
    },
    rows: (data ?? []).map((r) => ({
      id: r.id as string,
      workspaceId: r.workspace_id as string,
      type: (r.type as string) ?? "unknown",
      publicUrl: (r.public_url as string | null) ?? null,
      createdAt: r.created_at as string,
    })),
  };
}

export async function getAdminContentList(input: {
  userId: string;
  limit?: number;
}) {
  await authorize(input.userId, "workspaces.read");
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("content_items")
    .select("id, workspace_id, type, source, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(input.limit ?? 100, 200));
  if (error) return [];
  return data ?? [];
}

export async function getAdminPublishingList(input: {
  userId: string;
  limit?: number;
}) {
  await authorize(input.userId, "workspaces.read");
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("publications")
    .select(
      "id, content_id, channel_id, status, scheduled_at, published_at, error, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(input.limit ?? 100, 200));
  if (error) return [];
  return data ?? [];
}

export async function getAdminSubscriptionsView(input: { userId: string }) {
  await authorize(input.userId, "billing.read");
  if (!supabaseConfigured()) {
    return {
      source: "workspaces.plan" as const,
      note: "subscriptions table unused — entitlements derived from workspaces.plan",
      rows: [] as Array<{
        workspaceId: string;
        name: string;
        plan: string;
        entitlements: ReturnType<typeof getWorkspaceEntitlements>;
      }>,
      stripe: unavailable<number>(
        "Payment provider integration required",
        "subscriptions",
      ),
    };
  }
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("workspaces")
    .select("id, name, plan")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return {
    source: "workspaces.plan" as const,
    note: "subscriptions table exists but is unused by the application; plan lives on workspaces",
    rows: (data ?? []).map((w) => {
      const plan = normalizePlanId(String(w.plan));
      return {
        workspaceId: w.id as string,
        name: (w.name as string) ?? "",
        plan,
        entitlements: getWorkspaceEntitlements(plan),
      };
    }),
    stripe: unavailable<number>(
      "Payment provider integration required for billing status / renewals",
      "subscriptions",
    ),
  };
}

export async function getAdminAIBreakdown(input: {
  userId: string;
  preset?: DateRangePreset;
}) {
  await authorize(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) {
    return {
      byModel: [] as Array<{
        model: string;
        provider: string;
        requests: number;
        failed: number;
        avgLatency: number | null;
        cost: number;
      }>,
      byFeature: [] as Array<{ feature: string; requests: number; failed: number }>,
      failures: [] as Array<{
        id: string;
        feature: string;
        model: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        createdAt: string;
      }>,
      latency: {
        p50: unavailable<number>("Supabase not configured"),
        p95: unavailable<number>("Supabase not configured"),
        p99: unavailable<number>("Supabase not configured"),
      },
      prompts: [] as Array<{
        feature: string;
        version: string;
        status: string;
        notes: string | null;
      }>,
    };
  }

  const db = getSupabaseAdmin();
  const AI_LIMIT = 2000;
  const { data } = await db
    .from("ai_usage_logs")
    .select(
      "id, feature, provider, model, status, latency_ms, estimated_cost, error_code, error_message, created_at",
    )
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false })
    .limit(AI_LIMIT);

  const rows = data ?? [];
  const modelMap = new Map<
    string,
    {
      model: string;
      provider: string;
      requests: number;
      failed: number;
      latencySum: number;
      latencyN: number;
      cost: number;
    }
  >();
  const featureMap = new Map<string, { feature: string; requests: number; failed: number }>();
  const latencies: number[] = [];

  for (const r of rows) {
    const model = (r.model as string) || "unknown";
    const provider = (r.provider as string) || "unknown";
    const key = `${provider}::${model}`;
    const m = modelMap.get(key) ?? {
      model,
      provider,
      requests: 0,
      failed: 0,
      latencySum: 0,
      latencyN: 0,
      cost: 0,
    };
    m.requests += 1;
    if (r.status === "failed") m.failed += 1;
    const lat = Number(r.latency_ms);
    if (Number.isFinite(lat) && lat >= 0) {
      m.latencySum += lat;
      m.latencyN += 1;
      latencies.push(lat);
    }
    m.cost += Number(r.estimated_cost ?? 0);
    modelMap.set(key, m);

    const feature = (r.feature as string) || "unknown";
    const f = featureMap.get(feature) ?? {
      feature,
      requests: 0,
      failed: 0,
    };
    f.requests += 1;
    if (r.status === "failed") f.failed += 1;
    featureMap.set(feature, f);
  }

  latencies.sort((a, b) => a - b);
  const percentile = (p: number): MetricResult<number> => {
    if (!latencies.length) {
      return unavailable("no latency samples", "ai_usage_logs.latency_ms");
    }
    if ((p === 95 || p === 99) && latencies.length < 20) {
      return unavailable(
        "Insufficient latency samples (need ≥20)",
        "ai_usage_logs.latency_ms",
      );
    }
    const idx = Math.min(
      latencies.length - 1,
      Math.max(0, Math.ceil((p / 100) * latencies.length) - 1),
    );
    return available(latencies[idx]!, "ai_usage_logs.latency_ms");
  };

  const { data: prompts, error: promptsError } = await db
    .from("ai_prompt_registry")
    .select("feature, version, status, notes")
    .order("feature");
  const promptsUnavailableReason = promptsError
    ? isMissingRelation(promptsError)
      ? "ai_prompt_registry table missing — apply migration 20260916010000_admin_phase3.sql"
      : `Query failed (${promptsError.code ?? "unknown"})`
    : null;

  return {
    byModel: [...modelMap.values()].map((m) => ({
      model: m.model,
      provider: m.provider,
      requests: m.requests,
      failed: m.failed,
      avgLatency: m.latencyN ? Math.round(m.latencySum / m.latencyN) : null,
      cost: m.cost,
    })),
    byFeature: [...featureMap.values()],
    failures: rows
      .filter((r) => r.status === "failed")
      .slice(0, 50)
      .map((r) => ({
        id: r.id as string,
        feature: r.feature as string,
        model: (r.model as string | null) ?? null,
        errorCode: (r.error_code as string | null) ?? null,
        errorMessage: sanitizeError((r.error_message as string | null) ?? null),
        createdAt: r.created_at as string,
      })),
    latency: {
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
    },
    prompts: (prompts ?? []).map((p) => ({
      feature: p.feature as string,
      version: p.version as string,
      status: p.status as string,
      notes: (p.notes as string | null) ?? null,
    })),
    promptsUnavailableReason,
  };
}

function sanitizeError(message: string | null): string | null {
  if (!message) return null;
  return message
    .replace(/password|token|api[_-]?key|secret|service.?role/gi, "[redacted]")
    .slice(0, 200);
}

export async function getAdminProductAnalytics(input: {
  userId: string;
  preset?: DateRangePreset;
}) {
  await authorize(input.userId, "system.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) {
    return {
      eventVolume: unavailable<number>("Supabase not configured"),
      byEvent: [] as Array<{ event: string; count: number }>,
      series: [] as Array<{ date: string; count: number }>,
    };
  }
  const db = getSupabaseAdmin();
  const EVENT_LIMIT = 5000;
  const { data } = await db
    .from("product_events")
    .select("id, event_name, occurred_at")
    .gte("occurred_at", range.start)
    .lt("occurred_at", range.end)
    .limit(EVENT_LIMIT);

  const rows = data ?? [];
  const byEvent = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const name = r.event_name as string;
    byEvent.set(name, (byEvent.get(name) ?? 0) + 1);
    const day = String(r.occurred_at).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const eventVolume: MetricResult<number> =
    rows.length === EVENT_LIMIT
      ? partial(
          rows.length,
          "product_events",
          "Event sample truncated at 5000 rows",
        )
      : available(rows.length, "product_events");

  return {
    eventVolume,
    byEvent: [...byEvent.entries()]
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count),
    series: [...byDay.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getAdminFunnelView(input: { userId: string }) {
  await authorize(input.userId, "system.read");
  const stages = [
    {
      id: "signup",
      label: "Signup",
      status: "available" as const,
      source: "profiles.created_at",
    },
    {
      id: "instagram_connected",
      label: "Instagram Connected",
      status: "unavailable" as const,
      reason: "No dedicated connection event instrumentation",
    },
    {
      id: "import_started",
      label: "Import Started",
      status: "partial" as const,
      source: "import_jobs / product_events.import_* when present",
    },
    {
      id: "import_completed",
      label: "Import Completed",
      status: "partial" as const,
      source: "instagram_imports / successful job status",
    },
    {
      id: "website_generated",
      label: "Website Generated",
      status: "partial" as const,
      source: "websites.created_at (table existence ≠ user action event)",
    },
    {
      id: "website_edited",
      label: "Website Edited",
      status: "unavailable" as const,
      reason: "No editor_save product event yet",
    },
    {
      id: "website_published",
      label: "Website Published",
      status: "partial" as const,
      source: "websites.published_at / status=published",
    },
  ];

  if (!supabaseConfigured()) {
    return { stages, counts: {} as Record<string, number | null> };
  }

  const db = getSupabaseAdmin();
  const [profiles, imports, websites] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("instagram_imports").select("id", { count: "exact", head: true }),
    db
      .from("websites")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
  ]);

  return {
    stages,
    counts: {
      signup: profiles.count ?? null,
      import_completed: imports.count ?? null,
      website_published: websites.count ?? null,
      instagram_connected: null,
      website_edited: null,
    } as Record<string, number | null>,
  };
}

/** PostgREST error codes meaning "table not in schema" (migration not applied). */
function isMissingRelation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /schema cache|does not exist/i.test(error.message ?? "")
  );
}

export type AdminIncidentsResult = {
  rows: Array<Record<string, unknown>>;
  /** Non-null when the list could not be trusted (e.g. migration missing). */
  unavailableReason: string | null;
};

export async function getAdminIncidents(input: {
  userId: string;
}): Promise<AdminIncidentsResult> {
  await authorize(input.userId, "system.read");
  if (!supabaseConfigured()) {
    return { rows: [], unavailableReason: "Supabase not configured" };
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("admin_incidents")
    .select(
      "id, title, severity, status, affected_system, summary, started_at, resolved_at, created_at",
    )
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) {
    return {
      rows: [],
      unavailableReason: isMissingRelation(error)
        ? "admin_incidents table missing — apply migration 20260916010000_admin_phase3.sql"
        : `Query failed (${error.code ?? "unknown"})`,
    };
  }
  return { rows: data ?? [], unavailableReason: null };
}

export async function getAdminAtRiskWorkspaces(input: { userId: string }) {
  const { rows } = await getAdminWorkspacesEnriched({
    userId: input.userId,
    limit: 200,
  });
  return rows.filter(
    (r) =>
      r.health.level === "at_risk" ||
      r.health.level === "blocked" ||
      r.health.level === "needs_attention",
  );
}

export type AdminSearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export async function searchAdminEntities(input: {
  userId: string;
  locale: string;
  q: string;
}): Promise<AdminSearchHit[]> {
  // Any authenticated admin may search; results are still bounded.
  await authorize(input.userId, "users.read");
  const q = input.q.trim();
  if (!q || !supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  const qSafe = sanitizeSearchTerm(q);
  const like = `%${qSafe}%`;
  const locale = input.locale;
  if (qSafe.length < 1 || like.length < 3) return [];

  const [users, workspaces, websites, jobs, orders, domains] = await Promise.all([
    db
      .from("profiles")
      .select("id, email, name")
      .or(`email.ilike."${like}",name.ilike."${like}"`)
      .limit(8),
    db
      .from("workspaces")
      .select("id, name")
      .ilike("name", like)
      .is("deleted_at", null)
      .limit(8),
    db
      .from("websites")
      .select("id, slug")
      .ilike("slug", like)
      .is("deleted_at", null)
      .limit(8),
    db
      .from("import_jobs")
      .select("id, status")
      .eq("id", q)
      .limit(5),
    db.from("store_orders").select("id, status").eq("id", q).limit(5),
    db.from("domains").select("id, host").ilike("host", like).limit(8),
  ]);

  const hits: AdminSearchHit[] = [];
  for (const u of users.data ?? []) {
    hits.push({
      type: "user",
      id: u.id as string,
      title: (u.email as string) ?? "",
      subtitle: (u.name as string) ?? undefined,
      href: `/${locale}/admin/users?focus=${u.id}`,
    });
  }
  for (const w of workspaces.data ?? []) {
    hits.push({
      type: "workspace",
      id: w.id as string,
      title: (w.name as string) ?? "",
      href: `/${locale}/admin/workspaces?focus=${w.id}`,
    });
  }
  for (const s of websites.data ?? []) {
    hits.push({
      type: "website",
      id: s.id as string,
      title: (s.slug as string) ?? "",
      href: `/${locale}/admin/websites?focus=${s.id}`,
    });
  }
  for (const j of jobs.data ?? []) {
    hits.push({
      type: "job",
      id: j.id as string,
      title: `Job ${(j.id as string).slice(0, 8)}`,
      subtitle: j.status as string,
      href: `/${locale}/admin/jobs?focus=${j.id}`,
    });
  }
  for (const o of orders.data ?? []) {
    hits.push({
      type: "order",
      id: o.id as string,
      title: `Order ${(o.id as string).slice(0, 8)}`,
      subtitle: o.status as string,
      href: `/${locale}/admin/orders?focus=${o.id}`,
    });
  }
  for (const d of domains.data ?? []) {
    hits.push({
      type: "domain",
      id: d.id as string,
      title: d.host as string,
      href: `/${locale}/admin/domains?focus=${d.id}`,
    });
  }
  return hits.slice(0, 30);
}
