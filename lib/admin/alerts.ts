import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export type AlertRuleInput = {
  name: string;
  metric: string;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  enabled?: boolean;
  channels?: unknown[];
  createdBy?: string | null;
};

export type AlertEvaluation = {
  metric: string;
  value: number;
  operator: AlertOperator;
  threshold: number;
};

const memoryRules: AlertRuleInput[] = [];
const memoryAlerts: Array<AlertEvaluation & { fired: boolean; severity: AlertSeverity }> =
  [];

export function __clearMemoryAlertsForTests() {
  memoryRules.length = 0;
  memoryAlerts.length = 0;
}

export function __getMemoryAlertsForTests() {
  return { rules: memoryRules, alerts: memoryAlerts };
}

export function evaluateAlertThreshold(input: AlertEvaluation): boolean {
  switch (input.operator) {
    case "gt":
      return input.value > input.threshold;
    case "gte":
      return input.value >= input.threshold;
    case "lt":
      return input.value < input.threshold;
    case "lte":
      return input.value <= input.threshold;
    case "eq":
      return input.value === input.threshold;
    default:
      return false;
  }
}

export async function createAlertRule(
  input: AlertRuleInput,
): Promise<{ id: string | null }> {
  memoryRules.push(input);
  if (!supabaseConfigured()) {
    return { id: `mem-rule-${memoryRules.length}` };
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("alert_rules")
      .insert({
        name: input.name,
        metric: input.metric,
        operator: input.operator,
        threshold: input.threshold,
        severity: input.severity,
        enabled: input.enabled ?? true,
        channels: input.channels ?? [],
        created_by: input.createdBy ?? null,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[alert-rules]", error.message);
      return { id: null };
    }
    return { id: data?.id ?? null };
  } catch (error) {
    console.error("[alert-rules] unexpected", error);
    return { id: null };
  }
}

export async function openAlert(params: {
  ruleId?: string | null;
  metric: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  memoryAlerts.push({
    metric: params.metric,
    value: params.value,
    operator: "gt",
    threshold: params.threshold,
    fired: true,
    severity: params.severity,
  });

  if (!supabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    await admin.from("alerts").insert({
      rule_id: params.ruleId ?? null,
      metric: params.metric,
      severity: params.severity,
      value: params.value,
      threshold: params.threshold,
      message: params.message ?? null,
      status: "open",
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    console.error("[alerts] unexpected", error);
  }
}
