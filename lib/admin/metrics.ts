import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export type DailyMetricKey =
  | "new_users"
  | "active_users"
  | "new_workspaces"
  | "websites_created"
  | "websites_published"
  | "imports"
  | "successful_imports"
  | "failed_imports"
  | "ai_requests"
  | "ai_cost"
  | "orders"
  | "revenue"
  | "subscriptions_started"
  | "subscriptions_canceled"
  | "page_views";

export type DailyMetricIncrement = {
  date?: string; // YYYY-MM-DD UTC
  increments: Partial<Record<DailyMetricKey, number>>;
  extras?: Record<string, unknown>;
};

const memoryDaily = new Map<string, Record<string, number>>();

export function __clearMemoryMetricsForTests() {
  memoryDaily.clear();
}

export function __getMemoryMetricsForTests() {
  return memoryDaily;
}

export function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Increment daily metric counters (server-side aggregation foundation).
 */
export async function incrementDailyMetrics(
  input: DailyMetricIncrement,
): Promise<void> {
  const date = input.date ?? utcDateKey();
  const current = memoryDaily.get(date) ?? {};
  for (const [key, value] of Object.entries(input.increments)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    current[key] = (current[key] ?? 0) + value;
  }
  memoryDaily.set(date, current);

  if (!supabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("daily_metrics")
      .select("*")
      .eq("date", date)
      .maybeSingle();

    if (!existing) {
      await admin.from("daily_metrics").insert({
        date,
        ...input.increments,
        extras: input.extras ?? {},
      });
      return;
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(input.increments)) {
      if (typeof value !== "number") continue;
      patch[key] = Number(existing[key] ?? 0) + value;
    }
    if (input.extras) {
      patch.extras = {
        ...(existing.extras as Record<string, unknown> | null) ?? {},
        ...input.extras,
      };
    }
    await admin.from("daily_metrics").update(patch).eq("date", date);
  } catch (error) {
    console.error("[daily-metrics] unexpected", error);
  }
}
