import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/lib/admin/rbac";
import type { MetricResult } from "@/lib/admin/contracts";
import {
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/admin/dates";
import {
  AI_PRICING_UNAVAILABLE_REASON,
  estimateCostFromTokens,
  isAiPricingConfigured,
} from "@/lib/admin/ai-pricing";
import {
  detectAiAnomalies,
  percentileSorted,
  LATENCY_P50_MIN_SAMPLES,
  LATENCY_P95_MIN_SAMPLES,
  LATENCY_P99_MIN_SAMPLES,
  type AnomalyWindowStats,
} from "@/lib/admin/phase4-anomalies";
import { normalizeJobStatus } from "@/lib/admin/jobs";
import { OPS_THRESHOLDS_MS, staleThresholdMs } from "@/lib/admin/ops-thresholds";
import type {
  AIAnomaly,
  AICostMetric,
  AIErrorMetric,
  AIFeatureMetric,
  AILatencyMetric,
  AIModelMetric,
  AIOverview,
  AIProviderMetric,
  AIRequestMetric,
  CronScheduleInfo,
  DependencyHealth,
  InfrastructureOverview,
  JobHealthMetric,
  ObservabilityEvent,
  QueueMetric,
  StaleJobRow,
  AlertThresholdView,
} from "@/lib/admin/phase4-contracts";

const AI_SAMPLE_CAP = 5000;
const JOB_SAMPLE_CAP = 2000;

/** Documented stale thresholds (ms) by normalized job status / type. */
export const STALE_JOB_THRESHOLDS_MS = {
  defaultRunning: OPS_THRESHOLDS_MS.defaultRunning,
  defaultQueued: OPS_THRESHOLDS_MS.defaultQueued,
  importAnalyze: OPS_THRESHOLDS_MS.importAnalyze,
} as const;

function available<T>(value: T, source: string): MetricResult<T> {
  return { status: "available", value, source };
}
function unavailable<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "unavailable", reason, source };
}
function metricError<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "error", reason, source };
}

/** Never surface raw Postgres / PostgREST messages to MetricResult consumers. */
function safeQueryFailure(scope: string, error: { message?: string } | null | undefined): string {
  if (error?.message) {
    console.error(`[admin:${scope}]`, error.message.slice(0, 300));
  }
  return "Query failed";
}
function insufficientSample<T = number>(
  reason: string,
  sampleSize: number,
  source?: string,
): MetricResult<T> {
  return { status: "insufficient_sample", reason, sampleSize, source };
}
function partialMetric<T>(value: T, source: string, warning: string): MetricResult<T> {
  return { status: "partial", value, source, warning };
}

function sanitizeIlike(raw: string): string {
  return raw.replace(/[%_,)(]/g, "").trim();
}

export function categorizeAiError(
  code: string | null | undefined,
  message: string | null | undefined,
): string {
  const c = (code ?? "").toLowerCase();
  const m = (message ?? "").toLowerCase();
  if (c.includes("rate") || m.includes("rate limit") || m.includes("429")) {
    return "rate_limit";
  }
  if (c.includes("timeout") || m.includes("timeout") || m.includes("timed out")) {
    return "timeout";
  }
  if (c.includes("auth") || m.includes("unauthorized") || m.includes("401") || m.includes("403")) {
    return "auth";
  }
  if (c.includes("invalid") || m.includes("invalid") || m.includes("400")) {
    return "invalid_request";
  }
  if (c.includes("provider") || m.includes("provider") || m.includes("5")) {
    return "provider_error";
  }
  if (!c && !m) return "unknown";
  return "application_error";
}

export function sanitizeAiErrorMessage(message: string | null): string | null {
  if (!message) return null;
  let out = message.slice(0, 200);
  out = out.replace(/sk-[a-zA-Z0-9]{10,}/g, "[redacted]");
  out = out.replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]");
  out = out.replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[redacted]");
  out = out.replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[jwt]");
  return out;
}

function rateMetric(
  numerator: number,
  denominator: number,
  source: string,
  minDenom = 1,
): MetricResult<number> {
  if (denominator < minDenom) {
    return insufficientSample("Insufficient sample for rate", denominator, source);
  }
  return available(numerator / denominator, source);
}

function latencyPercentile(
  sorted: number[],
  p: number,
  minSamples: number,
): MetricResult<number> {
  if (sorted.length < minSamples) {
    return insufficientSample(
      `Need ≥${minSamples} latency samples for p${p}`,
      sorted.length,
      "ai_usage_logs.latency_ms",
    );
  }
  const v = percentileSorted(sorted, p);
  if (v == null) return unavailable("no latency samples", "ai_usage_logs.latency_ms");
  return available(v, "ai_usage_logs.latency_ms");
}

function costFromRows(
  rows: Array<{
    provider?: string | null;
    model?: string | null;
    input_tokens?: number | null;
    output_tokens?: number | null;
    estimated_cost?: number | null;
  }>,
): MetricResult<number> {
  let sum = 0;
  let any = false;
  let allUnavailable = true;
  for (const r of rows) {
    const est = estimateCostFromTokens({
      provider: r.provider,
      model: r.model,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      loggedCost: r.estimated_cost != null ? Number(r.estimated_cost) : null,
    });
    if (est.status === "available") {
      sum += est.value;
      any = true;
      allUnavailable = false;
    }
  }
  if (any) return available(sum, "ai_usage_logs.estimated_cost|verified_pricing");
  if (allUnavailable) {
    return unavailable(AI_PRICING_UNAVAILABLE_REASON, "ai_pricing");
  }
  return unavailable(AI_PRICING_UNAVAILABLE_REASON, "ai_pricing");
}

type AiRow = {
  id: string;
  feature: string;
  provider: string | null;
  model: string | null;
  status: string;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost: number | null;
  error_code: string | null;
  error_message: string | null;
  workspace_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  correlation_id?: string | null;
};

async function fetchAiSample(input: {
  start: string;
  end: string;
  provider?: string;
  model?: string;
  feature?: string;
  status?: string;
  workspaceId?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AiRow[]; error: string | null; truncated: boolean }> {
  if (!supabaseConfigured()) {
    return { rows: [], error: null, truncated: false };
  }
  const db = getSupabaseAdmin();
  const limit = Math.min(input.limit ?? AI_SAMPLE_CAP, AI_SAMPLE_CAP);
  let q = db
    .from("ai_usage_logs")
    .select(
      "id, feature, provider, model, status, latency_ms, input_tokens, output_tokens, total_tokens, estimated_cost, error_code, error_message, workspace_id, user_id, created_at, metadata, correlation_id",
    )
    .gte("created_at", input.start)
    .lt("created_at", input.end)
    .order("created_at", { ascending: false })
    .range(input.offset ?? 0, (input.offset ?? 0) + limit - 1);

  if (input.provider) q = q.eq("provider", input.provider);
  if (input.model) q = q.eq("model", input.model);
  if (input.feature) q = q.eq("feature", input.feature);
  if (input.status) q = q.eq("status", input.status);
  if (input.workspaceId) q = q.eq("workspace_id", input.workspaceId);
  if (input.q) {
    const term = sanitizeIlike(input.q);
    if (term.length >= 2) {
      const like = `"%${term}%"`;
      q = q.or(
        `feature.ilike.${like},model.ilike.${like},provider.ilike.${like},error_code.ilike.${like}`,
      );
    }
  }

  const { data, error } = await q;
  if (error) {
    // correlation_id may be missing before migration — retry without it
    if (/correlation_id/i.test(error.message)) {
      let q2 = db
        .from("ai_usage_logs")
        .select(
          "id, feature, provider, model, status, latency_ms, input_tokens, output_tokens, total_tokens, estimated_cost, error_code, error_message, workspace_id, user_id, created_at, metadata",
        )
        .gte("created_at", input.start)
        .lt("created_at", input.end)
        .order("created_at", { ascending: false })
        .range(input.offset ?? 0, (input.offset ?? 0) + limit - 1);
      if (input.provider) q2 = q2.eq("provider", input.provider);
      if (input.model) q2 = q2.eq("model", input.model);
      if (input.feature) q2 = q2.eq("feature", input.feature);
      if (input.status) q2 = q2.eq("status", input.status);
      if (input.workspaceId) q2 = q2.eq("workspace_id", input.workspaceId);
      const retry = await q2;
      if (retry.error) {
        return { rows: [], error: safeQueryFailure("ai.sample.retry", retry.error), truncated: false };
      }
      const rows = (retry.data ?? []) as AiRow[];
      return { rows, error: null, truncated: rows.length === limit };
    }
    return { rows: [], error: safeQueryFailure("ai.sample", error), truncated: false };
  }
  const rows = (data ?? []) as AiRow[];
  return { rows, error: null, truncated: rows.length === limit };
}

function correlationFromRow(r: AiRow): string | null {
  if (r.correlation_id) return r.correlation_id;
  const meta = r.metadata;
  if (meta && typeof meta.correlationId === "string") return meta.correlationId;
  if (meta && typeof meta.correlation_id === "string") return meta.correlation_id;
  return null;
}

export async function getAdminAIOverview(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<AIOverview> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      range,
      requests: empty,
      successRate: empty,
      errorRate: empty,
      latencyP95: empty,
      tokens: empty,
      cost: empty,
      activeModels: empty,
      activeProviders: empty,
      sampleSize: 0,
      truncated: false,
    };
  }

  const { rows, error, truncated } = await fetchAiSample({
    start: range.start,
    end: range.end,
  });
  if (error) {
    const e = metricError<number>(`Query failed: ${error}`, "ai_usage_logs");
    return {
      range,
      requests: e,
      successRate: e,
      errorRate: e,
      latencyP95: e,
      tokens: e,
      cost: e,
      activeModels: e,
      activeProviders: e,
      sampleSize: 0,
      truncated: false,
    };
  }

  // Count terminal-ish rows: completed + failed (exclude started for rates)
  const terminal = rows.filter((r) => r.status === "completed" || r.status === "failed");
  const completed = terminal.filter((r) => r.status === "completed").length;
  const failed = terminal.filter((r) => r.status === "failed").length;
  const latencies = terminal
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);

  let tokenSum = 0;
  let tokenAny = false;
  for (const r of rows) {
    if (r.total_tokens != null && Number.isFinite(Number(r.total_tokens))) {
      tokenSum += Number(r.total_tokens);
      tokenAny = true;
    }
  }

  const models = new Set(
    rows.map((r) => (r.model || "").trim()).filter(Boolean),
  );
  const providers = new Set(
    rows.map((r) => (r.provider || "").trim()).filter(Boolean),
  );

  const reqMetric = truncated
    ? partialMetric(rows.length, "ai_usage_logs", `Sample truncated at ${AI_SAMPLE_CAP}`)
    : available(rows.length, "ai_usage_logs");

  return {
    range,
    requests: reqMetric,
    successRate: rateMetric(completed, terminal.length, "ai_usage_logs.status"),
    errorRate: rateMetric(failed, terminal.length, "ai_usage_logs.status"),
    latencyP95: latencyPercentile(latencies, 95, LATENCY_P95_MIN_SAMPLES),
    tokens: tokenAny
      ? available(tokenSum, "ai_usage_logs.total_tokens")
      : unavailable(
          "Token counts are not populated for current AI instrumentation paths.",
          "ai_usage_logs.total_tokens",
        ),
    cost: costFromRows(rows),
    activeModels: available(models.size, "ai_usage_logs.model"),
    activeProviders: available(providers.size, "ai_usage_logs.provider"),
    sampleSize: rows.length,
    truncated,
  };
}

export async function getAdminAIRequests(input: {
  userId: string;
  preset?: DateRangePreset;
  provider?: string;
  model?: string;
  feature?: string;
  status?: string;
  workspaceId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: AIRequestMetric[];
  totalHint: MetricResult<number>;
  page: number;
  pageSize: number;
}> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 100);
  const page = Math.max(input.page ?? 0, 0);
  if (!supabaseConfigured()) {
    return {
      rows: [],
      totalHint: unavailable("Supabase not configured"),
      page,
      pageSize,
    };
  }

  const { rows, error, truncated } = await fetchAiSample({
    start: range.start,
    end: range.end,
    provider: input.provider,
    model: input.model,
    feature: input.feature,
    status: input.status,
    workspaceId: input.workspaceId,
    q: input.q,
    limit: pageSize,
    offset: page * pageSize,
  });

  if (error) {
    return {
      rows: [],
      totalHint: metricError(error, "ai_usage_logs"),
      page,
      pageSize,
    };
  }

  return {
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      provider: r.provider,
      model: r.model,
      feature: r.feature,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      status: r.status,
      latencyMs: r.latency_ms,
      inputTokens: r.input_tokens,
      outputTokens: r.output_tokens,
      totalTokens: r.total_tokens,
      estimatedCost:
        r.estimated_cost != null ? Number(r.estimated_cost) : null,
      errorCode: r.error_code,
      errorCategory: categorizeAiError(r.error_code, r.error_message),
      correlationId: correlationFromRow(r),
    })),
    totalHint: truncated
      ? partialMetric(
          (page + 1) * pageSize,
          "ai_usage_logs",
          "Exact total unavailable — showing paginated sample",
        )
      : available(page * pageSize + rows.length, "ai_usage_logs"),
    page,
    pageSize,
  };
}

export async function getAdminAIModelsIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<{ models: AIModelMetric[]; truncated: boolean; error: string | null }> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) {
    return { models: [], truncated: false, error: null };
  }
  const { rows, error, truncated } = await fetchAiSample({
    start: range.start,
    end: range.end,
  });
  if (error) return { models: [], truncated: false, error };

  const map = new Map<
    string,
    {
      model: string;
      provider: string;
      requests: number;
      completed: number;
      failed: number;
      latencies: number[];
      tokens: number;
      tokenAny: boolean;
      costRows: AiRow[];
      features: Record<string, number>;
    }
  >();

  for (const r of rows) {
    const model = r.model || "unknown";
    const provider = r.provider || "unknown";
    const key = `${provider}::${model}`;
    const m = map.get(key) ?? {
      model,
      provider,
      requests: 0,
      completed: 0,
      failed: 0,
      latencies: [],
      tokens: 0,
      tokenAny: false,
      costRows: [],
      features: {},
    };
    m.requests += 1;
    if (r.status === "completed") m.completed += 1;
    if (r.status === "failed") m.failed += 1;
    const lat = Number(r.latency_ms);
    if (Number.isFinite(lat) && lat >= 0) m.latencies.push(lat);
    if (r.total_tokens != null) {
      m.tokens += Number(r.total_tokens);
      m.tokenAny = true;
    }
    m.costRows.push(r);
    m.features[r.feature] = (m.features[r.feature] ?? 0) + 1;
    map.set(key, m);
  }

  const models: AIModelMetric[] = [...map.values()].map((m) => {
    const sorted = m.latencies.slice().sort((a, b) => a - b);
    const terminal = m.completed + m.failed;
    return {
      id: `${m.provider}::${m.model}`,
      model: m.model,
      provider: m.provider,
      requests: m.requests,
      completed: m.completed,
      failed: m.failed,
      successRate: rateMetric(m.completed, terminal, "ai_usage_logs"),
      errorRate: rateMetric(m.failed, terminal, "ai_usage_logs"),
      p50: latencyPercentile(sorted, 50, LATENCY_P50_MIN_SAMPLES),
      p95: latencyPercentile(sorted, 95, LATENCY_P95_MIN_SAMPLES),
      p99: latencyPercentile(sorted, 99, LATENCY_P99_MIN_SAMPLES),
      tokens: m.tokenAny
        ? available(m.tokens, "ai_usage_logs.total_tokens")
        : unavailable("Token counts not populated", "ai_usage_logs.total_tokens"),
      cost: costFromRows(m.costRows),
      features: m.features,
    };
  });

  models.sort((a, b) => b.requests - a.requests);
  return { models, truncated, error: null };
}

export async function getAdminAIProvidersIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<{ providers: AIProviderMetric[]; truncated: boolean }> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) return { providers: [], truncated: false };
  const { rows, truncated } = await fetchAiSample({
    start: range.start,
    end: range.end,
  });

  const map = new Map<
    string,
    {
      provider: string;
      requests: number;
      completed: number;
      failed: number;
      latencies: number[];
      tokens: number;
      tokenAny: boolean;
      costRows: AiRow[];
      models: Set<string>;
      errorCategories: Record<string, number>;
    }
  >();

  for (const r of rows) {
    const provider = r.provider || "unknown";
    const m = map.get(provider) ?? {
      provider,
      requests: 0,
      completed: 0,
      failed: 0,
      latencies: [],
      tokens: 0,
      tokenAny: false,
      costRows: [],
      models: new Set<string>(),
      errorCategories: {},
    };
    m.requests += 1;
    if (r.status === "completed") m.completed += 1;
    if (r.status === "failed") {
      m.failed += 1;
      const cat = categorizeAiError(r.error_code, r.error_message);
      m.errorCategories[cat] = (m.errorCategories[cat] ?? 0) + 1;
    }
    const lat = Number(r.latency_ms);
    if (Number.isFinite(lat) && lat >= 0) m.latencies.push(lat);
    if (r.total_tokens != null) {
      m.tokens += Number(r.total_tokens);
      m.tokenAny = true;
    }
    m.costRows.push(r);
    if (r.model) m.models.add(r.model);
    map.set(provider, m);
  }

  const providers: AIProviderMetric[] = [...map.values()].map((m) => {
    const sorted = m.latencies.slice().sort((a, b) => a - b);
    const terminal = m.completed + m.failed;
    return {
      id: m.provider,
      provider: m.provider,
      requests: m.requests,
      completed: m.completed,
      failed: m.failed,
      observedSuccessRate: rateMetric(m.completed, terminal, "ai_usage_logs"),
      errorRate: rateMetric(m.failed, terminal, "ai_usage_logs"),
      p95: latencyPercentile(sorted, 95, LATENCY_P95_MIN_SAMPLES),
      tokens: m.tokenAny
        ? available(m.tokens, "ai_usage_logs.total_tokens")
        : unavailable("Token counts not populated", "ai_usage_logs.total_tokens"),
      cost: costFromRows(m.costRows),
      models: [...m.models],
      errorCategories: m.errorCategories,
    };
  });

  providers.sort((a, b) => b.requests - a.requests);
  return { providers, truncated };
}

export async function getAdminAIEconomics(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<AICostMetric> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  const pricingConfigured = isAiPricingConfigured();
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      range,
      totalCost: empty,
      costPerRequest: empty,
      byModel: [],
      byFeature: [],
      byProvider: [],
      byWorkspace: [],
      projectedSpend: empty,
      pricingConfigured,
    };
  }

  const { rows } = await fetchAiSample({ start: range.start, end: range.end });
  const totalCost = costFromRows(rows);
  const terminal = rows.filter((r) => r.status === "completed" || r.status === "failed");

  const byModelMap = new Map<string, AiRow[]>();
  const byFeatureMap = new Map<string, AiRow[]>();
  const byProviderMap = new Map<string, AiRow[]>();
  const byWsMap = new Map<string, AiRow[]>();

  for (const r of rows) {
    const mk = `${r.provider || "unknown"}::${r.model || "unknown"}`;
    byModelMap.set(mk, [...(byModelMap.get(mk) ?? []), r]);
    byFeatureMap.set(r.feature, [...(byFeatureMap.get(r.feature) ?? []), r]);
    const p = r.provider || "unknown";
    byProviderMap.set(p, [...(byProviderMap.get(p) ?? []), r]);
    if (r.workspace_id) {
      byWsMap.set(r.workspace_id, [...(byWsMap.get(r.workspace_id) ?? []), r]);
    }
  }

  let costPerRequest: MetricResult<number> = unavailable(AI_PRICING_UNAVAILABLE_REASON);
  if (totalCost.status === "available" && terminal.length > 0) {
    costPerRequest = available(totalCost.value / terminal.length, "derived");
  }

  // Projected spend: only with verified cost + ≥7 days of history in range
  let projectedSpend: MetricResult<number> = unavailable(
    "Projected spend requires verified cost telemetry and ≥7 days of history",
  );
  if (totalCost.status === "available") {
    const startMs = Date.parse(range.start);
    const endMs = Date.parse(range.end);
    const days = Math.max(1, (endMs - startMs) / 86400000);
    if (days >= 7) {
      const daily = totalCost.value / days;
      projectedSpend = available(daily * 30, "linear_projection_from_verified_cost");
    } else {
      projectedSpend = insufficientSample(
        "Need ≥7 days of verified cost history for projection",
        Math.floor(days),
        "ai_usage_logs",
      );
    }
  }

  return {
    range,
    totalCost,
    costPerRequest,
    byModel: [...byModelMap.entries()].map(([k, rs]) => {
      const [provider, model] = k.split("::");
      return {
        model: model ?? "unknown",
        provider: provider ?? "unknown",
        cost: costFromRows(rs),
        requests: rs.length,
      };
    }),
    byFeature: [...byFeatureMap.entries()].map(([feature, rs]) => ({
      feature,
      cost: costFromRows(rs),
      requests: rs.length,
    })),
    byProvider: [...byProviderMap.entries()].map(([provider, rs]) => ({
      provider,
      cost: costFromRows(rs),
      requests: rs.length,
    })),
    byWorkspace: [...byWsMap.entries()]
      .slice(0, 50)
      .map(([workspaceId, rs]) => ({
        workspaceId,
        cost: costFromRows(rs),
        requests: rs.length,
      })),
    projectedSpend,
    pricingConfigured,
  };
}

export async function getAdminAILatencyAnalysis(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<AILatencyMetric> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "7d" });
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      range,
      sampleSize: 0,
      volume: empty,
      p50: empty,
      p95: empty,
      p99: empty,
      errorRate: empty,
      series: [],
    };
  }

  const { rows, truncated } = await fetchAiSample({
    start: range.start,
    end: range.end,
  });
  const latencies = rows
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  const terminal = rows.filter((r) => r.status === "completed" || r.status === "failed");
  const failed = terminal.filter((r) => r.status === "failed").length;

  const byDay = new Map<string, { lats: number[]; total: number; failed: number }>();
  for (const r of rows) {
    const day = String(r.created_at).slice(0, 10);
    const b = byDay.get(day) ?? { lats: [], total: 0, failed: 0 };
    b.total += 1;
    if (r.status === "failed") b.failed += 1;
    const lat = Number(r.latency_ms);
    if (Number.isFinite(lat) && lat >= 0) b.lats.push(lat);
    byDay.set(day, b);
  }

  const series = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => {
      const sorted = b.lats.slice().sort((a, b2) => a - b2);
      return {
        date,
        count: b.total,
        p50:
          sorted.length >= LATENCY_P50_MIN_SAMPLES
            ? percentileSorted(sorted, 50)
            : null,
        p95:
          sorted.length >= LATENCY_P95_MIN_SAMPLES
            ? percentileSorted(sorted, 95)
            : null,
        errorRate: b.total > 0 ? b.failed / b.total : null,
      };
    });

  return {
    range,
    sampleSize: latencies.length,
    volume: truncated
      ? partialMetric(rows.length, "ai_usage_logs", `Truncated at ${AI_SAMPLE_CAP}`)
      : available(rows.length, "ai_usage_logs"),
    p50: latencyPercentile(latencies, 50, LATENCY_P50_MIN_SAMPLES),
    p95: latencyPercentile(latencies, 95, LATENCY_P95_MIN_SAMPLES),
    p99: latencyPercentile(latencies, 99, LATENCY_P99_MIN_SAMPLES),
    errorRate: rateMetric(failed, terminal.length, "ai_usage_logs.status"),
    series,
  };
}

export async function getAdminAIFailuresIntel(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<{
  failures: AIErrorMetric[];
  categories: Record<string, number>;
  failureCount: MetricResult<number>;
  errorRate: MetricResult<number>;
}> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) {
    return {
      failures: [],
      categories: {},
      failureCount: unavailable("Supabase not configured"),
      errorRate: unavailable("Supabase not configured"),
    };
  }

  const { rows, truncated } = await fetchAiSample({
    start: range.start,
    end: range.end,
    status: "failed",
    limit: 200,
  });
  const all = await fetchAiSample({ start: range.start, end: range.end });
  const terminal = all.rows.filter(
    (r) => r.status === "completed" || r.status === "failed",
  );
  const failedN = terminal.filter((r) => r.status === "failed").length;

  const categories: Record<string, number> = {};
  const failures: AIErrorMetric[] = rows.map((r) => {
    const cat = categorizeAiError(r.error_code, r.error_message);
    categories[cat] = (categories[cat] ?? 0) + 1;
    return {
      id: r.id,
      createdAt: r.created_at,
      feature: r.feature,
      provider: r.provider,
      model: r.model,
      workspaceId: r.workspace_id,
      errorCode: r.error_code,
      errorCategory: cat,
      safeMessage: sanitizeAiErrorMessage(r.error_message),
    };
  });

  return {
    failures,
    categories,
    failureCount: truncated
      ? partialMetric(failedN, "ai_usage_logs", "Sample may be truncated")
      : available(failedN, "ai_usage_logs"),
    errorRate: rateMetric(failedN, terminal.length, "ai_usage_logs"),
  };
}

export async function getAdminAIFeaturesIntel(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<AIFeatureMetric[]> {
  await requireAdminPermission(input.userId, "ai.read");
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  if (!supabaseConfigured()) return [];
  const { rows } = await fetchAiSample({ start: range.start, end: range.end });
  const map = new Map<string, AiRow[]>();
  for (const r of rows) {
    map.set(r.feature, [...(map.get(r.feature) ?? []), r]);
  }
  return [...map.entries()].map(([feature, rs]) => {
    const failed = rs.filter((r) => r.status === "failed").length;
    const terminal = rs.filter(
      (r) => r.status === "completed" || r.status === "failed",
    ).length;
    let tokens = 0;
    let tokenAny = false;
    for (const r of rs) {
      if (r.total_tokens != null) {
        tokens += Number(r.total_tokens);
        tokenAny = true;
      }
    }
    return {
      feature,
      requests: rs.length,
      failed,
      successRate: rateMetric(terminal - failed, terminal, "ai_usage_logs"),
      tokens: tokenAny
        ? available(tokens, "ai_usage_logs.total_tokens")
        : unavailable("Token counts not populated", "ai_usage_logs.total_tokens"),
      cost: costFromRows(rs),
    };
  });
}

function buildAnomalyStats(
  recent: AiRow[],
  baseline: AiRow[],
  windowLabel: string,
): AnomalyWindowStats {
  const term = (rows: AiRow[]) =>
    rows.filter((r) => r.status === "completed" || r.status === "failed");
  const rT = term(recent);
  const bT = term(baseline);
  const rFail = rT.filter((r) => r.status === "failed").length;
  const bFail = bT.filter((r) => r.status === "failed").length;
  const rLats = rT
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  const bLats = bT
    .map((r) => Number(r.latency_ms))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);

  const sumTokens = (rows: AiRow[]) => {
    let s = 0;
    let any = false;
    for (const r of rows) {
      if (r.total_tokens != null) {
        s += Number(r.total_tokens);
        any = true;
      }
    }
    return any ? s : null;
  };

  const costOf = (rows: AiRow[]) => {
    const c = costFromRows(rows);
    return c.status === "available" ? c.value : null;
  };

  const failByModel = new Map<string, number>();
  for (const r of rT.filter((x) => x.status === "failed")) {
    const m = r.model || "unknown";
    failByModel.set(m, (failByModel.get(m) ?? 0) + 1);
  }
  const modelFailureShare = [...failByModel.entries()].map(([model, failures]) => ({
    model,
    failures,
    share: rFail > 0 ? failures / rFail : 0,
  }));

  const featR = new Map<string, number>();
  const featB = new Map<string, number>();
  for (const r of recent) featR.set(r.feature, (featR.get(r.feature) ?? 0) + 1);
  for (const r of baseline) featB.set(r.feature, (featB.get(r.feature) ?? 0) + 1);
  const features = new Set([...featR.keys(), ...featB.keys()]);
  const featureVolume = [...features].map((feature) => ({
    feature,
    recent: featR.get(feature) ?? 0,
    baseline: featB.get(feature) ?? 0,
  }));

  return {
    recentRequests: rT.length,
    recentFailures: rFail,
    recentErrorRate: rT.length ? rFail / rT.length : 0,
    recentP95: percentileSorted(rLats, 95),
    recentTokens: sumTokens(recent),
    recentCost: costOf(recent),
    baselineRequests: bT.length,
    baselineFailures: bFail,
    baselineErrorRate: bT.length ? bFail / bT.length : 0,
    baselineP95: percentileSorted(bLats, 95),
    baselineTokens: sumTokens(baseline),
    baselineCost: costOf(baseline),
    modelFailureShare,
    featureVolume,
    windowLabel,
    detectedAt: new Date().toISOString(),
  };
}

export async function getAdminAIAnomalies(input: {
  userId: string;
}): Promise<AIAnomaly[]> {
  await requireAdminPermission(input.userId, "ai.read");
  if (!supabaseConfigured()) return [];
  const now = Date.now();
  const recentStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const baselineStart = new Date(now - 48 * 60 * 60 * 1000).toISOString();
  const end = new Date(now).toISOString();

  const [recent, baseline] = await Promise.all([
    fetchAiSample({ start: recentStart, end }),
    fetchAiSample({ start: baselineStart, end: recentStart }),
  ]);

  const stats = buildAnomalyStats(
    recent.rows,
    baseline.rows,
    "last_24h_vs_prior_24h",
  );
  return detectAiAnomalies(stats);
}

export function staleThresholdForJob(jobType: string | null | undefined, status: string): number {
  return staleThresholdMs({ jobType, status: String(normalizeJobStatus(status)) });
}

export async function getAdminJobHealth(input: {
  userId: string;
}): Promise<{ health: JobHealthMetric; staleRows: StaleJobRow[] }> {
  await requireAdminPermission(input.userId, "jobs.read");
  if (!supabaseConfigured()) {
    const empty = unavailable<number>("Supabase not configured");
    return {
      health: {
        queued: empty,
        running: empty,
        succeeded: empty,
        failed: empty,
        retrying: empty,
        stale: empty,
        avgDurationMs: empty,
        p95DurationMs: empty,
        retryRate: empty,
        failureRate: empty,
        staleThresholdMs: STALE_JOB_THRESHOLDS_MS.defaultRunning,
        sampleSize: 0,
      },
      staleRows: [],
    };
  }

  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("import_jobs")
    .select(
      "id, status, job_type, workspace_id, retry_count, duration_ms, updated_at, created_at",
    )
    .gte("created_at", since)
    .order("updated_at", { ascending: false })
    .limit(JOB_SAMPLE_CAP);

  if (error) {
    const e = metricError<number>(safeQueryFailure("jobs.health", error), "import_jobs");
    return {
      health: {
        queued: e,
        running: e,
        succeeded: e,
        failed: e,
        retrying: e,
        stale: e,
        avgDurationMs: e,
        p95DurationMs: e,
        retryRate: e,
        failureRate: e,
        staleThresholdMs: STALE_JOB_THRESHOLDS_MS.defaultRunning,
        sampleSize: 0,
      },
      staleRows: [],
    };
  }

  const rows = data ?? [];
  let queued = 0;
  let running = 0;
  let succeeded = 0;
  let failed = 0;
  let retrying = 0;
  let retried = 0;
  const durations: number[] = [];
  const staleRows: StaleJobRow[] = [];
  const now = Date.now();

  for (const r of rows) {
    const status = normalizeJobStatus(String(r.status));
    if (status === "queued") queued += 1;
    else if (status === "running") running += 1;
    else if (status === "completed") succeeded += 1;
    else if (status === "failed") failed += 1;
    else if (status === "retrying") retrying += 1;

    if (Number(r.retry_count) > 0) retried += 1;
    const d = Number(r.duration_ms);
    if (Number.isFinite(d) && d >= 0) durations.push(d);

    if (status === "queued" || status === "running" || status === "retrying") {
      const updated = Date.parse(String(r.updated_at ?? r.created_at));
      if (Number.isFinite(updated)) {
        const age = now - updated;
        const threshold = staleThresholdForJob(
          r.job_type as string | null,
          String(r.status),
        );
        if (age > threshold) {
          staleRows.push({
            id: r.id as string,
            status: String(r.status),
            jobType: (r.job_type as string | null) ?? null,
            workspaceId: (r.workspace_id as string | null) ?? null,
            updatedAt: String(r.updated_at ?? r.created_at),
            ageMs: age,
            staleThresholdMs: threshold,
          });
        }
      }
    }
  }

  durations.sort((a, b) => a - b);
  const terminal = succeeded + failed;
  const avg =
    durations.length > 0
      ? available(
          Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
          "import_jobs.duration_ms",
        )
      : unavailable("No duration samples", "import_jobs.duration_ms");
  const p95 =
    durations.length >= 20
      ? available(percentileSorted(durations, 95)!, "import_jobs.duration_ms")
      : insufficientSample(
          "Need ≥20 duration samples for p95",
          durations.length,
          "import_jobs.duration_ms",
        );

  return {
    health: {
      queued: available(queued, "import_jobs"),
      running: available(running, "import_jobs"),
      succeeded: available(succeeded, "import_jobs"),
      failed: available(failed, "import_jobs"),
      retrying: available(retrying, "import_jobs"),
      stale: available(staleRows.length, "import_jobs.updated_at"),
      avgDurationMs: avg,
      p95DurationMs: p95,
      retryRate: rateMetric(retried, rows.length, "import_jobs.retry_count"),
      failureRate: rateMetric(failed, terminal, "import_jobs.status"),
      staleThresholdMs: STALE_JOB_THRESHOLDS_MS.defaultRunning,
      sampleSize: rows.length,
    },
    staleRows: staleRows.slice(0, 50),
  };
}

export async function getAdminQueueMetrics(input: {
  userId: string;
}): Promise<QueueMetric[]> {
  await requireAdminPermission(input.userId, "jobs.read");
  // Only real queue: import_jobs as the durable import worker queue.
  if (!supabaseConfigured()) {
    return [
      {
        id: "import_jobs",
        name: "import_jobs",
        depth: unavailable("Supabase not configured"),
        oldestAgeMs: unavailable("Supabase not configured"),
        throughput24h: unavailable("Supabase not configured"),
        successRate: unavailable("Supabase not configured"),
        failureRate: unavailable("Supabase not configured"),
        retryRate: unavailable("Supabase not configured"),
        source: "import_jobs",
      },
    ];
  }

  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [depthRes, oldestRes, recentRes] = await Promise.all([
    db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "retrying"]),
    db
      .from("import_jobs")
      .select("created_at")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1),
    db
      .from("import_jobs")
      .select("id, status, retry_count")
      .gte("updated_at", since)
      .limit(2000),
  ]);

  const recent = recentRes.data ?? [];
  const completed = recent.filter((r) => r.status === "completed").length;
  const failed = recent.filter((r) => r.status === "failed").length;
  const terminal = completed + failed;
  const retried = recent.filter((r) => Number(r.retry_count) > 0).length;
  const oldest = oldestRes.data?.[0]?.created_at
    ? Date.now() - Date.parse(String(oldestRes.data[0].created_at))
    : null;

  return [
    {
      id: "import_jobs",
      name: "Import job queue",
      depth:
        depthRes.error
          ? metricError(safeQueryFailure("queues.depth", depthRes.error), "import_jobs")
          : available(depthRes.count ?? 0, "import_jobs.status"),
      oldestAgeMs:
        oldest == null
          ? unavailable("No queued jobs", "import_jobs.created_at")
          : available(oldest, "import_jobs.created_at"),
      throughput24h: available(completed, "import_jobs.status=completed"),
      successRate: rateMetric(completed, terminal, "import_jobs"),
      failureRate: rateMetric(failed, terminal, "import_jobs"),
      retryRate: rateMetric(retried, recent.length, "import_jobs.retry_count"),
      source: "import_jobs (durable worker queue — not Redis/SQS)",
    },
  ];
}

export async function getAdminDependencyHealth(input: {
  userId: string;
}): Promise<DependencyHealth[]> {
  await requireAdminPermission(input.userId, "system.read");
  const now = new Date().toISOString();
  const deps: DependencyHealth[] = [];

  // Supabase
  if (!supabaseConfigured()) {
    deps.push({
      id: "supabase",
      name: "Supabase",
      status: "not_instrumented",
      evidence: "Supabase env not configured in this process",
      lastCheckedAt: now,
    });
  } else {
    try {
      const db = getSupabaseAdmin();
      const { error } = await db.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
      deps.push({
        id: "supabase",
        name: "Supabase",
        status: error ? "failing" : "healthy",
        evidence: error
          ? `Probe failed (${error.code ?? "error"})`
          : "Head select on profiles succeeded",
        lastCheckedAt: now,
      });
    } catch {
      deps.push({
        id: "supabase",
        name: "Supabase",
        status: "failing",
        evidence: "Probe threw unexpectedly",
        lastCheckedAt: now,
      });
    }
  }

  // AI provider — observed telemetry only
  if (supabaseConfigured()) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { rows } = await fetchAiSample({
      start: since,
      end: now,
      limit: 500,
    });
    const terminal = rows.filter(
      (r) => r.status === "completed" || r.status === "failed",
    );
    if (terminal.length < 5) {
      deps.push({
        id: "ai_provider",
        name: "AI provider(s)",
        status: "unknown",
        evidence: `Insufficient recent AI samples (n=${terminal.length})`,
        lastCheckedAt: now,
      });
    } else {
      const failed = terminal.filter((r) => r.status === "failed").length;
      const rate = failed / terminal.length;
      deps.push({
        id: "ai_provider",
        name: "AI provider(s)",
        status: rate >= 0.5 ? "failing" : rate >= 0.2 ? "degraded" : "healthy",
        evidence: `Observed error rate ${(rate * 100).toFixed(1)}% over last 24h (n=${terminal.length}) — not provider SLA`,
        lastCheckedAt: now,
      });
    }
  } else {
    deps.push({
      id: "ai_provider",
      name: "AI provider(s)",
      status: "unknown",
      evidence: "No AI telemetry without Supabase",
      lastCheckedAt: now,
    });
  }

  // Instagram / import path
  if (supabaseConfigured()) {
    const db = getSupabaseAdmin();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: failedJobs } = await db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("updated_at", since);
    const { count: totalJobs } = await db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", since);
    const t = totalJobs ?? 0;
    const f = failedJobs ?? 0;
    if (t < 3) {
      deps.push({
        id: "instagram_import",
        name: "Instagram import",
        status: "unknown",
        evidence: `Insufficient recent import jobs (n=${t})`,
        lastCheckedAt: now,
      });
    } else {
      const rate = f / t;
      deps.push({
        id: "instagram_import",
        name: "Instagram import",
        status: rate >= 0.5 ? "failing" : rate >= 0.25 ? "degraded" : "healthy",
        evidence: `Import job failure rate ${(rate * 100).toFixed(1)}% (24h)`,
        lastCheckedAt: now,
      });
    }
  }

  // Explicitly not instrumented
  for (const [id, name] of [
    ["email", "Email provider"],
    ["storage_r2", "Object storage (R2)"],
    ["deployment", "Deployment platform"],
    ["webhooks", "Webhook infrastructure"],
  ] as const) {
    deps.push({
      id,
      name,
      status: "not_instrumented",
      evidence: "No production health probe or delivery telemetry in this repository",
      lastCheckedAt: now,
    });
  }

  return deps;
}

export async function getAdminInfrastructureOverview(input: {
  userId: string;
}): Promise<InfrastructureOverview> {
  await requireAdminPermission(input.userId, "system.read");
  const [jobHealth, queues, deps, anomalies] = await Promise.all([
    getAdminJobHealth({ userId: input.userId }).catch(() => null),
    getAdminQueueMetrics({ userId: input.userId }).catch(() => []),
    getAdminDependencyHealth({ userId: input.userId }),
    getAdminAIAnomalies({ userId: input.userId }).catch(() => []),
  ]);

  let openAlerts: MetricResult<number> = unavailable("Not loaded");
  let criticalAlerts: MetricResult<number> = unavailable("Not loaded");
  if (supabaseConfigured()) {
    const db = getSupabaseAdmin();
    const [open, critical] = await Promise.all([
      db.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
      db
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("severity", "critical"),
    ]);
    openAlerts = open.error
      ? metricError(safeQueryFailure("infra.openAlerts", open.error), "alerts")
      : available(open.count ?? 0, "alerts");
    criticalAlerts = critical.error
      ? metricError(safeQueryFailure("infra.criticalAlerts", critical.error), "alerts")
      : available(critical.count ?? 0, "alerts");
  }

  const aiErrorRate =
    anomalies.length > 0
      ? available(
          anomalies.find((a) => a.kind === "error_spike")?.observed ?? 0,
          "anomaly_engine",
        )
      : unavailable("No AI error anomaly in last 24h window", "anomaly_engine");

  const attention: InfrastructureOverview["attention"] = [];
  if (criticalAlerts.status === "available" && criticalAlerts.value > 0) {
    attention.push({
      id: "critical-alerts",
      severity: "critical",
      title: `${criticalAlerts.value} critical open alert(s)`,
      href: "/errors",
    });
  }
  if (jobHealth && jobHealth.health.stale.status === "available" && jobHealth.health.stale.value > 0) {
    attention.push({
      id: "stale-jobs",
      severity: "warning",
      title: `${jobHealth.health.stale.value} stale job(s)`,
      href: "/jobs",
    });
  }
  for (const a of anomalies.slice(0, 5)) {
    attention.push({
      id: a.id,
      severity: a.severity,
      title: a.title,
      href: "/ai/anomalies",
    });
  }
  for (const d of deps.filter((x) => x.status === "failing" || x.status === "degraded")) {
    attention.push({
      id: `dep-${d.id}`,
      severity: d.status === "failing" ? "critical" : "warning",
      title: `${d.name}: ${d.status}`,
      href: "/system",
    });
  }

  let systemStatus: InfrastructureOverview["systemStatus"] = "healthy";
  let systemStatusReason = "No critical signals in available instrumentation";
  if (deps.some((d) => d.status === "failing") || (criticalAlerts.status === "available" && criticalAlerts.value > 0)) {
    systemStatus = "critical";
    systemStatusReason = "Critical alerts or failing dependencies observed";
  } else if (
    deps.some((d) => d.status === "degraded") ||
    (jobHealth && jobHealth.health.stale.status === "available" && jobHealth.health.stale.value > 0) ||
    anomalies.some((a) => a.severity === "warning" || a.severity === "critical")
  ) {
    systemStatus = "degraded";
    systemStatusReason = "Degraded dependency, stale jobs, or AI anomalies detected";
  } else if (deps.every((d) => d.status === "unknown" || d.status === "not_instrumented")) {
    systemStatus = "unknown";
    systemStatusReason = "Insufficient instrumentation to declare healthy";
  }

  const importQueue = queues[0];

  return {
    systemStatus,
    systemStatusReason,
    failedJobs24h: jobHealth?.health.failed ?? unavailable("Job health unavailable"),
    staleJobs: jobHealth?.health.stale ?? unavailable("Job health unavailable"),
    queueDepth: importQueue?.depth ?? unavailable("Queue metrics unavailable"),
    openAlerts,
    criticalAlerts,
    aiErrorRate,
    dependencies: deps,
    attention,
  };
}

export function getConfiguredCronSchedules(): CronScheduleInfo[] {
  // Keep names aligned with recordCronRun(jobName) in instrumented workers.
  return [
    {
      id: "jobs-process",
      name: "import_jobs_process",
      path: "/api/jobs/process",
      configuredSchedule: "0 3 * * * (vercel.json) + on-demand worker wake",
      executionHistory: unavailable(
        "See cron_runs when Phase 5 migration is applied",
        "cron",
      ),
    },
    {
      id: "publishing-process-due",
      name: "publishing_process_due",
      path: "/api/publishing/process-due",
      configuredSchedule: "0 4 * * * (vercel.json)",
      executionHistory: unavailable(
        "See cron_runs when Phase 5 migration is applied",
        "cron",
      ),
    },
  ];
}

export async function getAdminObservabilityTimeline(input: {
  userId: string;
  limit?: number;
}): Promise<ObservabilityEvent[]> {
  await requireAdminPermission(input.userId, "system.read");
  if (!supabaseConfigured()) return [];
  const limit = Math.min(input.limit ?? 40, 100);
  const db = getSupabaseAdmin();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [sys, aiFail, jobs] = await Promise.all([
    db
      .from("system_events")
      .select("id, event_name, severity, source, message, occurred_at, metadata")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(limit),
    db
      .from("ai_usage_logs")
      .select("id, feature, status, workspace_id, user_id, created_at, error_code, error_message, correlation_id")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("import_jobs")
      .select("id, status, workspace_id, updated_at, error_message, job_type")
      .eq("status", "failed")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const events: ObservabilityEvent[] = [];

  for (const e of sys.data ?? []) {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    events.push({
      id: e.id as string,
      occurredAt: e.occurred_at as string,
      category: "system",
      severity: ((e.severity as string) || "info") as ObservabilityEvent["severity"],
      source: String(e.source ?? "system_events"),
      entityType: typeof meta.entityType === "string" ? meta.entityType : null,
      entityId: typeof meta.entityId === "string" ? meta.entityId : null,
      workspaceId: typeof meta.workspaceId === "string" ? meta.workspaceId : null,
      userId: typeof meta.userId === "string" ? meta.userId : null,
      correlationId:
        typeof meta.correlationId === "string" ? meta.correlationId : null,
      message: String(e.message ?? e.event_name ?? "system event"),
    });
  }

  // AI failures — ignore if correlation_id column missing
  const aiRows = aiFail.error && /correlation_id/i.test(aiFail.error.message)
    ? (
        await db
          .from("ai_usage_logs")
          .select("id, feature, status, workspace_id, user_id, created_at, error_code, error_message")
          .eq("status", "failed")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20)
      ).data
    : aiFail.data;

  for (const e of aiRows ?? []) {
    events.push({
      id: `ai-${e.id}`,
      occurredAt: e.created_at as string,
      category: "ai",
      severity: "warning",
      source: "ai_usage_logs",
      entityType: "ai_usage",
      entityId: e.id as string,
      workspaceId: (e.workspace_id as string | null) ?? null,
      userId: (e.user_id as string | null) ?? null,
      correlationId: (e as { correlation_id?: string | null }).correlation_id ?? null,
      message: sanitizeAiErrorMessage(
        (e.error_message as string | null) ?? (e.error_code as string | null),
      ) ?? `AI failure (${e.feature})`,
    });
  }

  for (const e of jobs.data ?? []) {
    events.push({
      id: `job-${e.id}`,
      occurredAt: e.updated_at as string,
      category: "import",
      severity: "warning",
      source: "import_jobs",
      entityType: "import_job",
      entityId: e.id as string,
      workspaceId: (e.workspace_id as string | null) ?? null,
      userId: null,
      correlationId: null,
      message: sanitizeAiErrorMessage((e.error_message as string | null) ?? null) ??
        `Import job failed (${e.job_type ?? "job"})`,
    });
  }

  events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return events.slice(0, limit);
}

export async function getAdminAlertRules(input: {
  userId: string;
}): Promise<{ rules: AlertThresholdView[]; unavailableReason: string | null }> {
  await requireAdminPermission(input.userId, "system.read");
  if (!supabaseConfigured()) {
    return { rules: [], unavailableReason: "Supabase not configured" };
  }
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("alert_rules")
    .select("id, name, metric, operator, threshold, severity, enabled")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin:alert_rules]", error.message.slice(0, 300));
    return { rules: [], unavailableReason: "Alert rules query failed" };
  }
  return {
    rules: (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      metric: r.metric as string,
      operator: r.operator as string,
      threshold: Number(r.threshold),
      severity: r.severity as string,
      enabled: Boolean(r.enabled),
    })),
    unavailableReason: null,
  };
}

/**
 * Idempotent alert evaluation: opens an alert only when no open alert
 * exists for the same rule_id + metric.
 */
export async function evaluateAndOpenAlert(input: {
  ruleId: string;
  metric: string;
  value: number;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  threshold: number;
  severity: "info" | "warning" | "critical";
  message?: string;
}): Promise<{ fired: boolean; suppressedDuplicate: boolean }> {
  const { evaluateAlertThreshold, openAlert } = await import("@/lib/admin/alerts");
  const fired = evaluateAlertThreshold({
    metric: input.metric,
    value: input.value,
    operator: input.operator,
    threshold: input.threshold,
  });
  if (!fired) return { fired: false, suppressedDuplicate: false };
  if (!supabaseConfigured()) {
    await openAlert({
      ruleId: input.ruleId,
      metric: input.metric,
      severity: input.severity,
      value: input.value,
      threshold: input.threshold,
      message: input.message,
    });
    return { fired: true, suppressedDuplicate: false };
  }
  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("alerts")
    .select("id")
    .eq("rule_id", input.ruleId)
    .eq("metric", input.metric)
    .eq("status", "open")
    .limit(1);
  if (existing && existing.length > 0) {
    return { fired: true, suppressedDuplicate: true };
  }
  await openAlert({
    ruleId: input.ruleId,
    metric: input.metric,
    severity: input.severity,
    value: input.value,
    threshold: input.threshold,
    message: input.message,
  });
  return { fired: true, suppressedDuplicate: false };
}
