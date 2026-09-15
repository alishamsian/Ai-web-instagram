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
  aiRequestCount: number;
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

  if (!supabaseConfigured()) {
    return {
      metrics: {
        totalUsers: unavailable("Supabase not configured"),
        newUsers: unavailable("Supabase not configured"),
        withWorkspace: unavailable("Supabase not configured"),
        withWebsite: unavailable("Supabase not configured"),
        publishedUsers: unavailable("Supabase not configured"),
        planDistribution: unavailable("Supabase not configured"),
        lastActivity: unavailable(
          "Last activity requires session/activity instrumentation",
          "product_events",
        ),
      },
      rows: [],
    };
  }

  const db = getSupabaseAdmin();
  const profilesQ = db
    .from("profiles")
    .select("id, email, name, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit * 3, 500));

  const [profilesRes, workspacesRes, websitesRes, importsRes, aiRes] =
    await Promise.all([
      profilesQ,
      db
        .from("workspaces")
        .select("id, owner_id, name, plan")
        .is("deleted_at", null),
      db
        .from("websites")
        .select("id, workspace_id, status")
        .is("deleted_at", null),
      db.from("instagram_imports").select("id, workspace_id"),
      db.from("ai_usage_logs").select("id, user_id").limit(5000),
    ]);

  const profilesRaw = profilesRes.data ?? [];
  const q = input.q?.trim().toLowerCase();
  const profiles = (
    q
      ? profilesRaw.filter(
          (p) =>
            String(p.email ?? "")
              .toLowerCase()
              .includes(q) ||
            String(p.name ?? "")
              .toLowerCase()
              .includes(q),
        )
      : profilesRaw
  ).slice(0, limit);
  const workspaces = workspacesRes.data ?? [];
  const websites = websitesRes.data ?? [];
  const imports = importsRes.data ?? [];
  const aiLogs = aiRes.data ?? [];

  const wsByOwner = new Map<string, (typeof workspaces)[0]>();
  for (const ws of workspaces) {
    if (!wsByOwner.has(ws.owner_id as string)) {
      wsByOwner.set(ws.owner_id as string, ws);
    }
  }

  const sitesByWs = new Map<string, typeof websites>();
  for (const site of websites) {
    const wid = site.workspace_id as string;
    const list = sitesByWs.get(wid) ?? [];
    list.push(site);
    sitesByWs.set(wid, list);
  }

  const importsByWs = new Map<string, number>();
  for (const item of imports) {
    const wid = item.workspace_id as string;
    importsByWs.set(wid, (importsByWs.get(wid) ?? 0) + 1);
  }

  const aiByUser = new Map<string, number>();
  for (const log of aiLogs) {
    const uid = log.user_id as string | null;
    if (!uid) continue;
    aiByUser.set(uid, (aiByUser.get(uid) ?? 0) + 1);
  }

  const rows: AdminUserListItem[] = profiles.map((p) => {
    const ws = wsByOwner.get(p.id as string) ?? null;
    const sites = ws ? sitesByWs.get(ws.id as string) ?? [] : [];
    const published = sites.filter((s) => s.status === "published").length;
    const health = ws
      ? assessWorkspaceHealth({
          websiteCount: sites.length,
          publishedCount: published,
          failedImportJobs: 0,
          successfulImports: importsByWs.get(ws.id as string) ?? 0,
          domainCount: 0,
          plan: String(ws.plan ?? "free"),
        })
      : null;

    return {
      id: p.id as string,
      email: (p.email as string) ?? "",
      name: (p.name as string | null) ?? null,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      createdAt: p.created_at as string,
      workspaceId: ws ? (ws.id as string) : null,
      workspaceName: ws ? (ws.name as string) : null,
      plan: ws ? normalizePlanId(String(ws.plan)) : null,
      websiteCount: sites.length,
      publishedCount: published,
      importCount: ws ? importsByWs.get(ws.id as string) ?? 0 : 0,
      aiRequestCount: aiByUser.get(p.id as string) ?? 0,
      health,
    };
  });

  const planDist: Record<string, number> = {};
  for (const ws of workspaces) {
    const plan = normalizePlanId(String(ws.plan));
    planDist[plan] = (planDist[plan] ?? 0) + 1;
  }

  const withWebsiteOwners = new Set(
    websites.map((s) => {
      const ws = workspaces.find((w) => w.id === s.workspace_id);
      return ws?.owner_id as string | undefined;
    }).filter(Boolean) as string[],
  );
  const publishedOwners = new Set(
    websites
      .filter((s) => s.status === "published")
      .map((s) => {
        const ws = workspaces.find((w) => w.id === s.workspace_id);
        return ws?.owner_id as string | undefined;
      })
      .filter(Boolean) as string[],
  );

  const newUsers = profiles.filter(
    (p) =>
      Date.parse(p.created_at as string) >= Date.parse(range.start) &&
      Date.parse(p.created_at as string) < Date.parse(range.end),
  ).length;

  // Total users — recount without search filter
  const { count: totalCount } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return {
    metrics: {
      totalUsers: available(totalCount ?? profiles.length, "profiles"),
      newUsers: available(newUsers, "profiles.created_at"),
      withWorkspace: available(wsByOwner.size, "workspaces.owner_id"),
      withWebsite: available(withWebsiteOwners.size, "websites"),
      publishedUsers: available(publishedOwners.size, "websites.status"),
      planDistribution: available(planDist, "workspaces.plan"),
      lastActivity: unavailable(
        "Last activity requires reliable session/product activity instrumentation",
        "product_events",
      ),
    },
    rows,
  };
}

export type AdminUser360 = {
  user: AdminUserListItem;
  entitlements: ReturnType<typeof getWorkspaceEntitlements> | null;
  notes: Array<{ id: string; body: string; createdAt: string; authorUserId: string | null }>;
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
  const { rows } = await getAdminUsersEnriched({
    userId: input.userId,
    limit: 200,
  });
  const user = rows.find((r) => r.id === input.targetUserId);
  if (!user) return null;

  const db = getSupabaseAdmin();
  const [notesRes, eventsRes, sitesRes] = await Promise.all([
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
    user.workspaceId
      ? db
          .from("websites")
          .select("id, slug, status, updated_at")
          .eq("workspace_id", user.workspaceId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  return {
    user,
    entitlements: user.plan ? getWorkspaceEntitlements(user.plan) : null,
    notes: (notesRes.data ?? []).map((n) => ({
      id: n.id as string,
      body: n.body as string,
      createdAt: n.created_at as string,
      authorUserId: (n.author_user_id as string | null) ?? null,
    })),
    recentActivity: (eventsRes.data ?? []).map((e) => ({
      id: e.id as string,
      kind: "product",
      action: e.event_name as string,
      occurredAt: e.occurred_at as string,
    })),
    websites: ((sitesRes.data ?? []) as Array<{
      id: string;
      slug: string;
      status: string;
      updated_at: string;
    }>).map((s) => ({
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
  const [wsRes, sitesRes, importsRes, domainsRes, ordersRes, jobsRes] =
    await Promise.all([
      db
        .from("workspaces")
        .select("id, owner_id, name, plan, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit),
      db
        .from("websites")
        .select("id, workspace_id, status")
        .is("deleted_at", null),
      db.from("instagram_imports").select("id, workspace_id"),
      db.from("domains").select("id, website_id"),
      db.from("store_orders").select("id, workspace_id"),
      db
        .from("import_jobs")
        .select("id, workspace_id, status")
        .eq("status", "failed")
        .limit(2000),
    ]);

  const workspaces = wsRes.data ?? [];
  const websites = sitesRes.data ?? [];
  const siteIdToWs = new Map(
    websites.map((s) => [s.id as string, s.workspace_id as string]),
  );

  const domainByWs = new Map<string, number>();
  for (const d of domainsRes.data ?? []) {
    const wid = siteIdToWs.get(d.website_id as string);
    if (!wid) continue;
    domainByWs.set(wid, (domainByWs.get(wid) ?? 0) + 1);
  }

  const rows: AdminWorkspaceListItem[] = workspaces.map((ws) => {
    const wid = ws.id as string;
    const sites = websites.filter((s) => s.workspace_id === wid);
    const published = sites.filter((s) => s.status === "published").length;
    const importCount = (importsRes.data ?? []).filter(
      (i) => i.workspace_id === wid,
    ).length;
    const orderCount = (ordersRes.data ?? []).filter(
      (o) => o.workspace_id === wid,
    ).length;
    const failedJobs = (jobsRes.data ?? []).filter(
      (j) => j.workspace_id === wid,
    ).length;
    const health = assessWorkspaceHealth({
      websiteCount: sites.length,
      publishedCount: published,
      failedImportJobs: failedJobs,
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

  const planDist: Record<string, number> = {};
  for (const r of rows) {
    planDist[r.plan] = (planDist[r.plan] ?? 0) + 1;
  }

  return {
    metrics: {
      total: available(rows.length, "workspaces"),
      withWebsites: available(
        rows.filter((r) => r.websiteCount > 0).length,
        "websites",
      ),
      published: available(
        rows.filter((r) => r.publishedCount > 0).length,
        "websites.status",
      ),
      planDistribution: available(planDist, "workspaces.plan"),
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
  const [sitesRes, domainsRes, viewsRes] = await Promise.all([
    db
      .from("websites")
      .select(
        "id, workspace_id, slug, status, version, created_at, updated_at, published_at",
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
    db.from("domains").select("id, website_id, host"),
    db.from("page_views").select("website_id").limit(10000),
  ]);

  const domains = domainsRes.data ?? [];
  const domainBySite = new Map<string, string>();
  for (const d of domains) {
    if (!domainBySite.has(d.website_id as string)) {
      domainBySite.set(d.website_id as string, d.host as string);
    }
  }

  const viewsBySite = new Map<string, number>();
  for (const v of viewsRes.data ?? []) {
    const sid = v.website_id as string;
    viewsBySite.set(sid, (viewsBySite.get(sid) ?? 0) + 1);
  }

  const rows: AdminWebsiteListItem[] = (sitesRes.data ?? []).map((s) => {
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
      pageViews: viewsBySite.get(id) ?? 0,
      health: assessWebsiteHealth({
        status: s.status as string,
        hasDomain: Boolean(host),
        publishedAt: (s.published_at as string | null) ?? null,
        updatedAt: s.updated_at as string,
      }),
    };
  });

  const published = rows.filter((r) => r.status === "published").length;
  return {
    metrics: {
      total: available(rows.length, "websites"),
      published: available(published, "websites.status"),
      unpublished: available(rows.length - published, "websites.status"),
      withDomain: available(
        rows.filter((r) => r.domainHost).length,
        "domains",
      ),
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
    .select("id, website_id, host, created_at, websites!inner(slug, workspace_id, status)")
    .order("created_at", { ascending: false })
    .limit(Math.min(input.limit ?? 100, 200));
  return (data ?? []).map((row) => {
    const site = row.websites as unknown as {
      slug: string;
      workspace_id: string;
      status: string;
    };
    return {
      id: row.id as string,
      host: row.host as string,
      websiteId: row.website_id as string,
      websiteSlug: site.slug,
      workspaceId: site.workspace_id,
      websiteStatus: site.status,
      createdAt: row.created_at as string,
      health: site.status === "published" ? "connected" : "unknown",
    };
  });
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
  const { data } = await db
    .from("ai_usage_logs")
    .select(
      "id, feature, provider, model, status, latency_ms, estimated_cost, error_code, error_message, created_at",
    )
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false })
    .limit(2000);

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
    const idx = Math.min(
      latencies.length - 1,
      Math.max(0, Math.ceil((p / 100) * latencies.length) - 1),
    );
    return available(latencies[idx]!, "ai_usage_logs.latency_ms");
  };

  const { data: prompts } = await db
    .from("ai_prompt_registry")
    .select("feature, version, status, notes")
    .order("feature");

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
  const { data } = await db
    .from("product_events")
    .select("id, event_name, occurred_at")
    .gte("occurred_at", range.start)
    .lt("occurred_at", range.end)
    .limit(5000);

  const rows = data ?? [];
  const byEvent = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const name = r.event_name as string;
    byEvent.set(name, (byEvent.get(name) ?? 0) + 1);
    const day = String(r.occurred_at).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return {
    eventVolume: available(rows.length, "product_events"),
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

export async function getAdminIncidents(input: { userId: string }) {
  await authorize(input.userId, "system.read");
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("admin_incidents")
    .select(
      "id, title, severity, status, affected_system, summary, started_at, resolved_at, created_at",
    )
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return data ?? [];
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
  const like = `%${q.replace(/[%_,]/g, "")}%`;
  const locale = input.locale;
  if (like.length < 3) return [];

  const [users, workspaces, websites, jobs, orders, domains] = await Promise.all([
    db
      .from("profiles")
      .select("id, email, name")
      .or(`email.ilike.${like},name.ilike.${like}`)
      .limit(8),
    db.from("workspaces").select("id, name").ilike("name", like).limit(8),
    db.from("websites").select("id, slug").ilike("slug", like).limit(8),
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
