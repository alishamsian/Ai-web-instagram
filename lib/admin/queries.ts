import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission, type AdminActor } from "@/lib/admin/rbac";
import type { AdminPermission } from "@/lib/admin/permissions";
import {
  resolveDateRange,
  resolveComparisonPeriod,
  type DateRange,
  type DateRangePreset,
} from "@/lib/admin/dates";
import type {
  ActivityItem,
  AlertSummary,
  AIMetrics,
  ComparableMetric,
  DashboardKpis,
  ImportMetrics,
  MetricResult,
  RevenueMetrics,
  SystemHealthMetrics,
  UserMetrics,
  WebsiteMetrics,
} from "@/lib/admin/contracts";
import {
  logAdminFailure,
  listOk,
  listUnavailable,
  type AdminListResult,
} from "@/lib/admin/safe";

export type AdminQueryRangeInput = {
  userId: string;
  preset?: DateRangePreset;
  timezone?: string;
  customStart?: string;
  customEnd?: string;
};

async function authorize(
  userId: string,
  permission: AdminPermission,
): Promise<AdminActor> {
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

function deltaRatio(
  current: MetricResult<number>,
  previous: MetricResult<number>,
): MetricResult<number> {
  if (current.status !== "available" || previous.status !== "available") {
    return unavailable("comparison requires both periods");
  }
  if (previous.value === 0) {
    return current.value === 0
      ? available(0, "delta")
      : unavailable("previous period was zero");
  }
  return available((current.value - previous.value) / previous.value, "delta");
}

function comparable(
  current: MetricResult<number>,
  previous: MetricResult<number>,
): ComparableMetric {
  return { current, previous, deltaRatio: deltaRatio(current, previous) };
}

function rangeFromInput(input: AdminQueryRangeInput): DateRange {
  return resolveDateRange({
    preset: input.preset ?? "30d",
    timezone: input.timezone,
    customStart: input.customStart,
    customEnd: input.customEnd,
  });
}

async function sumDailyMetric(
  column: string,
  range: DateRange,
): Promise<MetricResult<number>> {
  if (!supabaseConfigured()) {
    return unavailable("Supabase not configured", "daily_metrics");
  }
  try {
    const db = getSupabaseAdmin();
    const startDay = range.start.slice(0, 10);
    const endDay = new Date(Date.parse(range.end) - 1).toISOString().slice(0, 10);
    const { data, error } = await db
      .from("daily_metrics")
      .select(column)
      .gte("date", startDay)
      .lte("date", endDay);
    if (error) {
      logAdminFailure("sumDailyMetric", error.message, { column });
      return unavailable("daily_metrics query failed", "daily_metrics");
    }
    if (!data || data.length === 0) {
      return unavailable(
        "No daily_metrics rows for selected period",
        "daily_metrics",
      );
    }
    const total = data.reduce(
      (sum, row) =>
        sum + Number((row as unknown as Record<string, unknown>)[column] ?? 0),
      0,
    );
    return available(total, `daily_metrics.${column}`);
  } catch (error) {
    logAdminFailure("sumDailyMetric", error, { column });
    return unavailable("daily_metrics query failed", "daily_metrics");
  }
}

async function countTable(params: {
  table: string;
  timeColumn: string;
  range: DateRange;
  eq?: Record<string, string>;
  isNull?: string[];
}): Promise<MetricResult<number>> {
  if (!supabaseConfigured()) {
    return unavailable("Supabase not configured", params.table);
  }
  try {
    const db = getSupabaseAdmin();
    let q = db
      .from(params.table)
      .select("id", { count: "exact", head: true })
      .gte(params.timeColumn, params.range.start)
      .lt(params.timeColumn, params.range.end);
    for (const [k, v] of Object.entries(params.eq ?? {})) {
      q = q.eq(k, v);
    }
    for (const col of params.isNull ?? []) {
      q = q.is(col, null);
    }
    const { count, error } = await q;
    if (error) {
      logAdminFailure("countTable", error.message, { table: params.table });
      return unavailable("Count query failed", params.table);
    }
    return available(count ?? 0, `${params.table}.${params.timeColumn}`);
  } catch (error) {
    logAdminFailure("countTable", error, { table: params.table });
    return unavailable("Count query failed", params.table);
  }
}

export async function getAdminDashboardMetrics(
  input: AdminQueryRangeInput,
): Promise<DashboardKpis> {
  await authorize(input.userId, "system.read");
  const range = rangeFromInput(input);
  const comparison = resolveComparisonPeriod(range);

  const [
    newUsersC,
    newUsersP,
    websitesCreatedC,
    websitesCreatedP,
    websitesPublishedC,
    websitesPublishedP,
    importsC,
    importsP,
    okImportsC,
    okImportsP,
    failImportsC,
    failImportsP,
    aiC,
    aiP,
    aiCostC,
    aiCostP,
    ordersC,
    ordersP,
    pageViewsC,
    pageViewsP,
    subStartC,
    subStartP,
  ] = await Promise.all([
    sumDailyMetric("new_users", range),
    sumDailyMetric("new_users", comparison.previous),
    sumDailyMetric("websites_created", range),
    sumDailyMetric("websites_created", comparison.previous),
    sumDailyMetric("websites_published", range),
    sumDailyMetric("websites_published", comparison.previous),
    sumDailyMetric("imports", range),
    sumDailyMetric("imports", comparison.previous),
    sumDailyMetric("successful_imports", range),
    sumDailyMetric("successful_imports", comparison.previous),
    sumDailyMetric("failed_imports", range),
    sumDailyMetric("failed_imports", comparison.previous),
    sumDailyMetric("ai_requests", range),
    sumDailyMetric("ai_requests", comparison.previous),
    sumDailyMetric("ai_cost", range),
    sumDailyMetric("ai_cost", comparison.previous),
    sumDailyMetric("orders", range),
    sumDailyMetric("orders", comparison.previous),
    sumDailyMetric("page_views", range),
    sumDailyMetric("page_views", comparison.previous),
    sumDailyMetric("subscriptions_started", range),
    sumDailyMetric("subscriptions_started", comparison.previous),
  ]);

  // Fallbacks when daily_metrics empty/unavailable — real table counts, never invented.
  async function withTableFallback(
    metric: MetricResult<number>,
    fallback: () => Promise<MetricResult<number>>,
  ): Promise<MetricResult<number>> {
    if (metric.status === "unavailable") return fallback();
    if (metric.status === "available" && metric.value === 0) return fallback();
    return metric;
  }

  const [
    websitesCreated,
    websitesCreatedPrev,
    newUsersResolved,
    newUsersPrevResolved,
    importsResolved,
    importsPrevResolved,
    websitesPublishedResolved,
    websitesPublishedPrevResolved,
  ] = await Promise.all([
    withTableFallback(websitesCreatedC, () =>
      countTable({
        table: "websites",
        timeColumn: "created_at",
        range,
        isNull: ["deleted_at"],
      }),
    ),
    withTableFallback(websitesCreatedP, () =>
      countTable({
        table: "websites",
        timeColumn: "created_at",
        range: comparison.previous,
        isNull: ["deleted_at"],
      }),
    ),
    withTableFallback(newUsersC, () =>
      countTable({ table: "profiles", timeColumn: "created_at", range }),
    ),
    withTableFallback(newUsersP, () =>
      countTable({
        table: "profiles",
        timeColumn: "created_at",
        range: comparison.previous,
      }),
    ),
    withTableFallback(importsC, () =>
      countTable({
        table: "instagram_imports",
        timeColumn: "created_at",
        range,
      }),
    ),
    withTableFallback(importsP, () =>
      countTable({
        table: "instagram_imports",
        timeColumn: "created_at",
        range: comparison.previous,
      }),
    ),
    withTableFallback(websitesPublishedC, () =>
      countTable({
        table: "websites",
        timeColumn: "published_at",
        range,
        eq: { status: "published" },
        isNull: ["deleted_at"],
      }),
    ),
    withTableFallback(websitesPublishedP, () =>
      countTable({
        table: "websites",
        timeColumn: "published_at",
        range: comparison.previous,
        eq: { status: "published" },
        isNull: ["deleted_at"],
      }),
    ),
  ]);

  return {
    range,
    comparison,
    newUsers: comparable(newUsersResolved, newUsersPrevResolved),
    activeUsers: comparable(
      unavailable("active_users requires session/activity instrumentation"),
      unavailable("active_users requires session/activity instrumentation"),
    ),
    websitesCreated: comparable(websitesCreated, websitesCreatedPrev),
    websitesPublished: comparable(
      websitesPublishedResolved,
      websitesPublishedPrevResolved,
    ),
    imports: comparable(importsResolved, importsPrevResolved),
    successfulImports: comparable(okImportsC, okImportsP),
    failedImports: comparable(failImportsC, failImportsP),
    aiRequests: comparable(aiC, aiP),
    aiCost: comparable(aiCostC, aiCostP),
    orders: comparable(ordersC, ordersP),
    mrr: unavailable(
      "MRR unavailable — subscriptions unused and no payment provider",
      "subscriptions",
    ),
    revenue: unavailable(
      "Revenue unavailable — store_orders has no amount column",
      "store_orders",
    ),
    pageViews: comparable(pageViewsC, pageViewsP),
    subscriptionsStarted: comparable(subStartC, subStartP),
  };
}

export async function getAdminUsers(input: AdminQueryRangeInput & { limit?: number }) {
  await authorize(input.userId, "users.read");
  const limit = Math.min(input.limit ?? 50, 200);
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("profiles")
    .select("id, email, name, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logAdminFailure("getAdminUsers", error);
    return [];
  }
  return data ?? [];
}

export async function getAdminWorkspaces(
  input: AdminQueryRangeInput & { includeDeleted?: boolean; limit?: number },
) {
  await authorize(input.userId, "workspaces.read");
  const limit = Math.min(input.limit ?? 50, 200);
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  let q = db
    .from("workspaces")
    .select("id, owner_id, name, plan, created_at, deleted_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!input.includeDeleted) q = q.is("deleted_at", null);
  const { data, error } = await q;
  if (error) {
    logAdminFailure("getAdminWorkspaces", error);
    return [];
  }
  return data ?? [];
}

export async function getAdminWebsites(
  input: AdminQueryRangeInput & { includeDeleted?: boolean; limit?: number },
) {
  await authorize(input.userId, "websites.read");
  const limit = Math.min(input.limit ?? 50, 200);
  if (!supabaseConfigured()) return [];
  const db = getSupabaseAdmin();
  let q = db
    .from("websites")
    .select(
      "id, workspace_id, slug, status, version, created_at, updated_at, published_at, deleted_at",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (!input.includeDeleted) q = q.is("deleted_at", null);
  const { data, error } = await q;
  if (error) {
    logAdminFailure("getAdminWebsites", error);
    return [];
  }
  return data ?? [];
}

export async function getAdminImports(
  input: AdminQueryRangeInput & { limit?: number },
): Promise<AdminListResult<Record<string, unknown>>> {
  await authorize(input.userId, "imports.read");
  const limit = Math.min(input.limit ?? 50, 200);
  if (!supabaseConfigured()) {
    return listUnavailable("Supabase not configured");
  }
  const range = rangeFromInput(input);
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("instagram_imports")
    .select(
      "id, workspace_id, username, scrape_status, collector, created_at, updated_at",
    )
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    logAdminFailure("getAdminImports", error);
    return listUnavailable("Import list query failed");
  }
  return listOk((data ?? []) as Record<string, unknown>[]);
}

export async function getAdminJobs(
  input: AdminQueryRangeInput & { limit?: number; status?: string },
): Promise<AdminListResult<Record<string, unknown>>> {
  await authorize(input.userId, "jobs.read");
  const limit = Math.min(input.limit ?? 50, 200);
  if (!supabaseConfigured()) {
    return listUnavailable("Supabase not configured");
  }
  const db = getSupabaseAdmin();
  let q = db
    .from("import_jobs")
    .select(
      "id, workspace_id, user_id, status, stage, job_type, retry_count, max_attempts, duration_ms, error_code, error_message, created_at, updated_at, started_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (input.status) q = q.eq("status", input.status);
  const { data, error } = await q;
  if (error) {
    logAdminFailure("getAdminJobs", error);
    return listUnavailable("Job list query failed");
  }
  return listOk((data ?? []) as Record<string, unknown>[]);
}

export async function getAdminRevenue(
  input: AdminQueryRangeInput,
): Promise<RevenueMetrics> {
  await authorize(input.userId, "billing.read");
  const range = rangeFromInput(input);
  const comparison = resolveComparisonPeriod(range);
  const [ordersC, ordersP] = await Promise.all([
    sumDailyMetric("orders", range),
    sumDailyMetric("orders", comparison.previous),
  ]);
  return {
    range,
    mrr: unavailable("MRR unavailable — no payment provider", "subscriptions"),
    revenue: unavailable(
      "Revenue unavailable — store_orders has no amount",
      "store_orders",
    ),
    orders: comparable(ordersC, ordersP),
    paidOrders: unavailable(
      "Paid order status not standardized for revenue",
      "store_orders",
    ),
  };
}

export async function getAdminOrders(
  input: AdminQueryRangeInput & { limit?: number },
): Promise<AdminListResult<Record<string, unknown>>> {
  await authorize(input.userId, "orders.read");
  const limit = Math.min(input.limit ?? 50, 200);
  if (!supabaseConfigured()) {
    return listUnavailable("Supabase not configured");
  }
  const range = rangeFromInput(input);
  const db = getSupabaseAdmin();
  // Deliberately excludes customer_contact / customer_note / items:
  // the admin list needs no customer PII, and the column is added by a
  // later migration that may not be applied on every environment.
  const { data, error } = await db
    .from("store_orders")
    .select("id, website_id, workspace_id, channel, status, created_at")
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logAdminFailure("getAdminOrders", error);
    return listUnavailable("Order list query failed");
  }
  return listOk((data ?? []) as Record<string, unknown>[]);
}

export async function getAdminAIUsage(
  input: AdminQueryRangeInput,
): Promise<AIMetrics> {
  await authorize(input.userId, "ai.read");
  const range = rangeFromInput(input);
  const comparison = resolveComparisonPeriod(range);

  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured", "ai_usage_logs");
    return {
      range,
      requests: comparable(empty, empty),
      completed: empty,
      failed: empty,
      estimatedCost: comparable(empty, empty),
      avgLatencyMs: empty,
    };
  }

  const db = getSupabaseAdmin();
  const AI_SAMPLE_LIMIT = 2000;
  const { data, error } = await db
    .from("ai_usage_logs")
    .select("status, estimated_cost, latency_ms, created_at")
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(AI_SAMPLE_LIMIT);
  if (error) {
    logAdminFailure("getAdminAIMetrics", error.message);
    const empty = unavailable<number>("AI metrics query failed", "ai_usage_logs");
    return {
      range,
      requests: comparable(empty, empty),
      completed: empty,
      failed: empty,
      estimatedCost: comparable(empty, empty),
      avgLatencyMs: empty,
    };
  }

  const rows = data ?? [];
  const truncated = rows.length === AI_SAMPLE_LIMIT;
  const warn = "Sample truncated at 2000 rows";
  const metric = (value: number, source: string): MetricResult<number> =>
    truncated ? partial(value, source, warn) : available(value, source);

  const completed = rows.filter((r) => r.status === "completed").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const cost = rows.reduce(
    (sum, r) => sum + Number(r.estimated_cost ?? 0),
    0,
  );
  const latencies = rows
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const avgLatency =
    latencies.length === 0
      ? unavailable<number>("no latency samples", "ai_usage_logs")
      : truncated
        ? partial(
            Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
            "ai_usage_logs.latency_ms",
            warn,
          )
        : available(
            Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
            "ai_usage_logs.latency_ms",
          );

  const prev = await sumDailyMetric("ai_requests", comparison.previous);
  const prevCost = await sumDailyMetric("ai_cost", comparison.previous);

  return {
    range,
    requests: comparable(metric(rows.length, "ai_usage_logs"), prev),
    completed: metric(completed, "ai_usage_logs"),
    failed: metric(failed, "ai_usage_logs"),
    estimatedCost: comparable(
      metric(cost, "ai_usage_logs.estimated_cost"),
      prevCost,
    ),
    avgLatencyMs: avgLatency,
  };
}

export async function getAdminSystemHealth(
  input: { userId: string },
): Promise<SystemHealthMetrics> {
  await authorize(input.userId, "system.read");
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      openAlerts: empty,
      criticalAlerts: empty,
      recentSystemEvents: empty,
      failedJobs24h: empty,
      queueDepth: empty,
    };
  }

  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [openAlerts, criticalAlerts, systemEvents, failedJobs, queued] =
    await Promise.all([
      db
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      db
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("severity", "critical"),
      db
        .from("system_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since),
      db
        .from("import_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("updated_at", since),
      db
        .from("import_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "queued"),
    ]);

  const countMetric = (
    res: { count: number | null; error: { message: string } | null },
    source: string,
  ): MetricResult<number> => {
    if (res.error) return unavailable("Count query failed", source);
    if (res.count == null) return unavailable("Count not returned", source);
    return available(res.count, source);
  };

  return {
    openAlerts: countMetric(openAlerts, "alerts"),
    criticalAlerts: countMetric(criticalAlerts, "alerts"),
    recentSystemEvents: countMetric(systemEvents, "system_events"),
    failedJobs24h: countMetric(failedJobs, "import_jobs"),
    queueDepth: countMetric(queued, "import_jobs"),
  };
}

export async function getAdminAlerts(
  input: { userId: string; limit?: number },
): Promise<AdminListResult<AlertSummary>> {
  await authorize(input.userId, "system.read");
  if (!supabaseConfigured()) {
    return listUnavailable("Supabase not configured");
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("alerts")
    .select(
      "id, metric, severity, status, value, threshold, message, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(input.limit ?? 50, 200));
  if (error) {
    logAdminFailure("getAdminAlerts", error);
    return listUnavailable("Alerts query failed");
  }
  return listOk(
    (data ?? []).map((row) => ({
      id: row.id as string,
      metric: row.metric as string,
      severity: row.severity as AlertSummary["severity"],
      status: row.status as AlertSummary["status"],
      value: row.value == null ? null : Number(row.value),
      threshold: row.threshold == null ? null : Number(row.threshold),
      message: (row.message as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
  );
}

export async function getAdminActivity(
  input: AdminQueryRangeInput & { limit?: number },
): Promise<ActivityItem[]> {
  await authorize(input.userId, "audit.read");
  if (!supabaseConfigured()) return [];
  const limit = Math.min(input.limit ?? 50, 200);
  const range = rangeFromInput(input);
  const db = getSupabaseAdmin();

  const [audit, product] = await Promise.all([
    db
      .from("admin_audit_logs")
      .select(
        "id, action, actor_user_id, resource_type, resource_id, workspace_id, reason, created_at",
      )
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .order("created_at", { ascending: false })
      .limit(limit),
    db
      .from("product_events")
      .select(
        "id, event_name, user_id, workspace_id, resource_type, resource_id, occurred_at",
      )
      .gte("occurred_at", range.start)
      .lt("occurred_at", range.end)
      .order("occurred_at", { ascending: false })
      .limit(limit),
  ]);

  const items: ActivityItem[] = [];
  for (const row of audit.data ?? []) {
    items.push({
      id: row.id as string,
      kind: "audit",
      action: row.action as string,
      actorUserId: row.actor_user_id as string | null,
      resourceType: row.resource_type as string | null,
      resourceId: row.resource_id as string | null,
      workspaceId: row.workspace_id as string | null,
      occurredAt: row.created_at as string,
      summary: (row.reason as string | null) ?? null,
    });
  }
  for (const row of product.data ?? []) {
    items.push({
      id: row.id as string,
      kind: "product",
      action: row.event_name as string,
      actorUserId: row.user_id as string | null,
      resourceType: row.resource_type as string | null,
      resourceId: row.resource_id as string | null,
      workspaceId: row.workspace_id as string | null,
      occurredAt: row.occurred_at as string,
    });
  }

  return items
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, limit);
}

export async function getAdminUserMetrics(
  input: AdminQueryRangeInput,
): Promise<UserMetrics> {
  await authorize(input.userId, "users.read");
  const range = rangeFromInput(input);
  const comparison = resolveComparisonPeriod(range);
  const [newC, newP, total] = await Promise.all([
    sumDailyMetric("new_users", range),
    sumDailyMetric("new_users", comparison.previous),
    countTable({
      table: "profiles",
      timeColumn: "created_at",
      range: {
        ...range,
        start: "1970-01-01T00:00:00.000Z",
        end: range.end,
        preset: "custom",
      },
    }),
  ]);
  return {
    range,
    newUsers: comparable(newC, newP),
    activeUsers: comparable(
      unavailable("active users not instrumented"),
      unavailable("active users not instrumented"),
    ),
    totalUsers: total,
  };
}

export async function getAdminWebsiteMetrics(
  input: AdminQueryRangeInput,
): Promise<WebsiteMetrics> {
  await authorize(input.userId, "websites.read");
  const range = rangeFromInput(input);
  const comparison = resolveComparisonPeriod(range);
  const [createdC, createdP, publishedC, publishedP, live, deleted] =
    await Promise.all([
      countTable({
        table: "websites",
        timeColumn: "created_at",
        range,
        isNull: ["deleted_at"],
      }),
      countTable({
        table: "websites",
        timeColumn: "created_at",
        range: comparison.previous,
        isNull: ["deleted_at"],
      }),
      sumDailyMetric("websites_published", range),
      sumDailyMetric("websites_published", comparison.previous),
      countTable({
        table: "websites",
        timeColumn: "created_at",
        range: {
          ...range,
          start: "1970-01-01T00:00:00.000Z",
          end: range.end,
          preset: "custom",
        },
        eq: { status: "published" },
        isNull: ["deleted_at"],
      }),
      supabaseConfigured()
        ? (async () => {
            const db = getSupabaseAdmin();
            const { count, error } = await db
              .from("websites")
              .select("id", { count: "exact", head: true })
              .not("deleted_at", "is", null);
            if (error) {
              logAdminFailure("getAdminWebsiteMetrics.softDeleted", error.message);
              return unavailable<number>("Count query failed", "websites");
            }
            return available(count ?? 0, "websites.deleted_at");
          })()
        : unavailable<number>("Supabase not configured", "websites"),
    ]);

  return {
    range,
    created: comparable(createdC, createdP),
    published: comparable(publishedC, publishedP),
    totalLive: live,
    softDeleted: deleted,
  };
}

export async function getAdminImportMetrics(
  input: AdminQueryRangeInput,
): Promise<ImportMetrics> {
  await authorize(input.userId, "imports.read");
  const range = rangeFromInput(input);
  const comparison = resolveComparisonPeriod(range);
  const [startedC, startedP, okC, okP, failC, failP] = await Promise.all([
    sumDailyMetric("imports", range),
    sumDailyMetric("imports", comparison.previous),
    sumDailyMetric("successful_imports", range),
    sumDailyMetric("successful_imports", comparison.previous),
    sumDailyMetric("failed_imports", range),
    sumDailyMetric("failed_imports", comparison.previous),
  ]);

  let successRate: MetricResult<number> = unavailable("insufficient data");
  if (okC.status === "available" && failC.status === "available") {
    const denom = okC.value + failC.value;
    successRate =
      denom === 0
        ? available(0, "derived")
        : available(okC.value / denom, "derived");
  }

  return {
    range,
    started: comparable(startedC, startedP),
    successful: comparable(okC, okP),
    failed: comparable(failC, failP),
    successRate,
  };
}

export type MetricSeriesPoint = {
  date: string;
  value: number;
};

export type MetricSeriesResult = {
  status: "available" | "unavailable";
  points: MetricSeriesPoint[];
  source: string;
  reason?: string;
};

/** Daily series for dashboard charts — never invents points. */
export async function getAdminMetricSeries(
  input: AdminQueryRangeInput & {
    column:
      | "new_users"
      | "websites_created"
      | "websites_published"
      | "imports"
      | "ai_requests"
      | "ai_cost"
      | "orders"
      | "page_views"
      | "successful_imports"
      | "failed_imports";
  },
): Promise<MetricSeriesResult> {
  await authorize(input.userId, "system.read");
  const range = rangeFromInput(input);
  if (!supabaseConfigured()) {
    return {
      status: "unavailable",
      points: [],
      source: "daily_metrics",
      reason: "Supabase not configured",
    };
  }
  try {
    const db = getSupabaseAdmin();
    const startDay = range.start.slice(0, 10);
    const endDay = new Date(Date.parse(range.end) - 1).toISOString().slice(0, 10);
    const { data, error } = await db
      .from("daily_metrics")
      .select(`date, ${input.column}`)
      .gte("date", startDay)
      .lte("date", endDay)
      .order("date", { ascending: true });
    if (error) {
      logAdminFailure("getAdminMetricSeries", error.message, {
        column: input.column,
      });
      return {
        status: "unavailable",
        points: [],
        source: "daily_metrics",
        reason: "daily_metrics query failed",
      };
    }
    const points = (data ?? []).map((row) => ({
      date: String((row as { date: string }).date),
      value: Number(
        (row as unknown as Record<string, unknown>)[input.column] ?? 0,
      ),
    }));
    return {
      status: "available",
      points,
      source: `daily_metrics.${input.column}`,
    };
  } catch (error) {
    logAdminFailure("getAdminMetricSeries", error, { column: input.column });
    return {
      status: "unavailable",
      points: [],
      source: "daily_metrics",
      reason: "daily_metrics query failed",
    };
  }
}
