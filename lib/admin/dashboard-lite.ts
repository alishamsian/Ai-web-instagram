import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/lib/admin/rbac";
import { resolveDateRange, resolveComparisonPeriod, type DateRangePreset } from "@/lib/admin/dates";
import type { DashboardKpis, MetricResult, ComparableMetric } from "@/lib/admin/contracts";

function unavailable<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "unavailable", reason, source };
}
function available<T>(value: T, source: string): MetricResult<T> {
  return { status: "available", value, source };
}
function delta(current: MetricResult<number>, previous: MetricResult<number>): MetricResult<number> {
  if (current.status !== "available" || previous.status !== "available") return unavailable("comparison requires both periods");
  if (previous.value === 0) return current.value === 0 ? available(0, "delta") : unavailable("previous period was zero");
  return available((current.value - previous.value) / previous.value, "delta");
}
function comparable(current: MetricResult<number>, previous: MetricResult<number>): ComparableMetric {
  return { current, previous, deltaRatio: delta(current, previous) };
}

type CountOptions = { isNull?: string };

async function count(
  table: string,
  column: string,
  range: { start: string; end: string },
  options?: CountOptions,
): Promise<MetricResult<number>> {
  if (!supabaseConfigured()) return unavailable("Supabase not configured", table);
  try {
    const db = getSupabaseAdmin();
    let q = db.from(table).select("id", { count: "exact", head: true }).gte(column, range.start).lt(column, range.end);
    if (options?.isNull) q = q.is(options.isNull, null);
    const { count: value, error } = await q;
    if (error) return unavailable("Count query failed", table);
    if (value == null) return unavailable("Count not returned", table);
    return available(value, `${table}.${column}`);
  } catch {
    return unavailable("Count query failed", table);
  }
}

export async function getAdminDashboardKpisLite(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<DashboardKpis> {
  await requireAdminPermission(input.userId, "system.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  const comparison = resolveComparisonPeriod(range);

  const [newUsers, newUsersPrev, websites, websitesPrev, published, publishedPrev, imports, importsPrev, orders, ordersPrev] = await Promise.all([
    count("profiles", "created_at", range), count("profiles", "created_at", comparison.previous),
    count("websites", "created_at", range, { isNull: "deleted_at" }), count("websites", "created_at", comparison.previous, { isNull: "deleted_at" }),
    count("websites", "published_at", range, { isNull: "deleted_at" }), count("websites", "published_at", comparison.previous, { isNull: "deleted_at" }),
    count("instagram_imports", "created_at", range), count("instagram_imports", "created_at", comparison.previous),
    count("store_orders", "created_at", range), count("store_orders", "created_at", comparison.previous),
  ]);

  const noActive = unavailable("Session/activity instrumentation is not available");
  const noAiCost = unavailable("AI cost telemetry is not available on the lightweight dashboard");
  const noRevenue = unavailable("Billing amount/currency telemetry is not available");
  const noMrr = unavailable("Billing provider telemetry is not available");
  const noSubscriptions = unavailable("Subscription-start telemetry is not available");
  const pageViews = unavailable("Page-view metric is intentionally deferred from the lightweight dashboard");
  const successfulImports = unavailable("Success status aggregation is available on /imports");
  const failedImports = unavailable("Failure status aggregation is available on /imports");
  const aiRequests = unavailable("AI telemetry is intentionally deferred to /ai");

  return {
    range,
    comparison,
    newUsers: comparable(newUsers, newUsersPrev),
    activeUsers: { current: noActive, previous: noActive, deltaRatio: unavailable("comparison unavailable") },
    websitesCreated: comparable(websites, websitesPrev),
    websitesPublished: comparable(published, publishedPrev),
    imports: comparable(imports, importsPrev),
    successfulImports: { current: successfulImports, previous: successfulImports, deltaRatio: unavailable("comparison unavailable") },
    failedImports: { current: failedImports, previous: failedImports, deltaRatio: unavailable("comparison unavailable") },
    aiRequests: { current: aiRequests, previous: aiRequests, deltaRatio: unavailable("comparison unavailable") },
    aiCost: { current: noAiCost, previous: noAiCost, deltaRatio: unavailable("comparison unavailable") },
    orders: comparable(orders, ordersPrev),
    mrr: noMrr,
    revenue: noRevenue,
    pageViews: { current: pageViews, previous: pageViews, deltaRatio: unavailable("comparison unavailable") },
    subscriptionsStarted: { current: noSubscriptions, previous: noSubscriptions, deltaRatio: unavailable("comparison unavailable") },
  };
}
