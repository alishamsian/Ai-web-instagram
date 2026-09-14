import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { sanitizeEventMetadata } from "@/lib/admin/events";

export type UsageFeature =
  | "ai_generations"
  | "instagram_imports"
  | "websites"
  | "storage_bytes"
  | "custom_domains"
  | "publishing_operations"
  | "orders"
  | "api_calls"
  | (string & {});

export type UsageEventInput = {
  feature: UsageFeature;
  quantity?: number;
  userId?: string | null;
  workspaceId: string;
  websiteId?: string | null;
  plan?: string | null;
  /** YYYY-MM for monthly, YYYY-MM-DD for daily. Defaults to current UTC month. */
  periodKey?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string | Date;
};

type CounterRow = {
  workspaceId: string;
  feature: string;
  periodKey: string;
  quantity: number;
};

const memoryEvents: UsageEventInput[] = [];
const memoryCounters = new Map<string, CounterRow>();

function counterKey(workspaceId: string, feature: string, periodKey: string) {
  return `${workspaceId}:${feature}:${periodKey}`;
}

export function __clearMemoryUsageForTests() {
  memoryEvents.length = 0;
  memoryCounters.clear();
}

export function __getMemoryUsageForTests() {
  return {
    events: memoryEvents,
    counters: [...memoryCounters.values()],
  };
}

export function currentMonthPeriodKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function currentDayPeriodKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toIso(value?: string | Date) {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

/**
 * Record a metered usage event and bump the period counter.
 */
export async function recordUsageEvent(input: UsageEventInput): Promise<void> {
  const quantity = input.quantity ?? 1;
  const periodKey = input.periodKey ?? currentMonthPeriodKey();
  const event: UsageEventInput = { ...input, quantity, periodKey };
  memoryEvents.push(event);

  const key = counterKey(input.workspaceId, input.feature, periodKey);
  const existing = memoryCounters.get(key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    memoryCounters.set(key, {
      workspaceId: input.workspaceId,
      feature: input.feature,
      periodKey,
      quantity,
    });
  }

  if (!supabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    const { error: insertError } = await admin.from("usage_events").insert({
      feature: input.feature,
      quantity,
      user_id: input.userId ?? null,
      workspace_id: input.workspaceId,
      website_id: input.websiteId ?? null,
      plan: input.plan ?? null,
      period_key: periodKey,
      metadata: sanitizeEventMetadata(input.metadata),
      occurred_at: toIso(input.occurredAt),
    });
    if (insertError) {
      console.error("[usage-events]", insertError.message);
      return;
    }

    const { data: row } = await admin
      .from("usage_counters")
      .select("id, quantity")
      .eq("workspace_id", input.workspaceId)
      .eq("feature", input.feature)
      .eq("period_key", periodKey)
      .maybeSingle();

    if (row?.id) {
      await admin
        .from("usage_counters")
        .update({
          quantity: Number(row.quantity) + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    } else {
      await admin.from("usage_counters").insert({
        workspace_id: input.workspaceId,
        feature: input.feature,
        period_key: periodKey,
        quantity,
      });
    }
  } catch (error) {
    console.error("[usage] unexpected", error);
  }
}

export async function getUsageCounter(params: {
  workspaceId: string;
  feature: UsageFeature;
  periodKey?: string;
}): Promise<number> {
  const periodKey = params.periodKey ?? currentMonthPeriodKey();
  const key = counterKey(params.workspaceId, params.feature, periodKey);
  const mem = memoryCounters.get(key)?.quantity ?? 0;

  if (!supabaseConfigured()) return mem;

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("usage_counters")
      .select("quantity")
      .eq("workspace_id", params.workspaceId)
      .eq("feature", params.feature)
      .eq("period_key", periodKey)
      .maybeSingle();
    return data ? Number(data.quantity) : mem;
  } catch {
    return mem;
  }
}
