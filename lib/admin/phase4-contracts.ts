/**
 * Phase 4 — AI + Infrastructure Intelligence contracts.
 * Prefer MetricResult; never invent numbers when instrumentation is missing.
 */

import type { MetricResult } from "@/lib/admin/contracts";
import type { DateRange } from "@/lib/admin/dates";

export type AIOverview = {
  range: DateRange;
  requests: MetricResult<number>;
  successRate: MetricResult<number>;
  errorRate: MetricResult<number>;
  latencyP95: MetricResult<number>;
  tokens: MetricResult<number>;
  cost: MetricResult<number>;
  activeModels: MetricResult<number>;
  activeProviders: MetricResult<number>;
  sampleSize: number;
  truncated: boolean;
};

export type AIRequestMetric = {
  id: string;
  createdAt: string;
  provider: string | null;
  model: string | null;
  feature: string;
  workspaceId: string | null;
  userId: string | null;
  status: string;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: number | null;
  errorCode: string | null;
  errorCategory: string | null;
  correlationId: string | null;
};

export type AIModelMetric = {
  id: string;
  model: string;
  provider: string;
  requests: number;
  completed: number;
  failed: number;
  successRate: MetricResult<number>;
  errorRate: MetricResult<number>;
  p50: MetricResult<number>;
  p95: MetricResult<number>;
  p99: MetricResult<number>;
  tokens: MetricResult<number>;
  cost: MetricResult<number>;
  features: Record<string, number>;
};

export type AIFeatureMetric = {
  feature: string;
  requests: number;
  failed: number;
  successRate: MetricResult<number>;
  tokens: MetricResult<number>;
  cost: MetricResult<number>;
};

export type AIProviderMetric = {
  id: string;
  provider: string;
  requests: number;
  completed: number;
  failed: number;
  /** Observed success rate from telemetry — not provider SLA uptime. */
  observedSuccessRate: MetricResult<number>;
  errorRate: MetricResult<number>;
  p95: MetricResult<number>;
  tokens: MetricResult<number>;
  cost: MetricResult<number>;
  models: string[];
  errorCategories: Record<string, number>;
};

export type AICostMetric = {
  range: DateRange;
  totalCost: MetricResult<number>;
  costPerRequest: MetricResult<number>;
  byModel: Array<{ model: string; provider: string; cost: MetricResult<number>; requests: number }>;
  byFeature: Array<{ feature: string; cost: MetricResult<number>; requests: number }>;
  byProvider: Array<{ provider: string; cost: MetricResult<number>; requests: number }>;
  byWorkspace: Array<{ workspaceId: string; cost: MetricResult<number>; requests: number }>;
  projectedSpend: MetricResult<number>;
  pricingConfigured: boolean;
};

export type AILatencyMetric = {
  range: DateRange;
  sampleSize: number;
  volume: MetricResult<number>;
  p50: MetricResult<number>;
  p95: MetricResult<number>;
  p99: MetricResult<number>;
  errorRate: MetricResult<number>;
  /** Daily buckets when sample allows — empty when unavailable. */
  series: Array<{
    date: string;
    count: number;
    p50: number | null;
    p95: number | null;
    errorRate: number | null;
  }>;
};

export type AIErrorMetric = {
  id: string;
  createdAt: string;
  feature: string;
  provider: string | null;
  model: string | null;
  workspaceId: string | null;
  errorCode: string | null;
  errorCategory: string;
  /** Sanitized message — never raw secrets/prompts. */
  safeMessage: string | null;
};

export type AIAnomaly = {
  id: string;
  kind:
    | "error_spike"
    | "latency_spike"
    | "token_spike"
    | "cost_spike"
    | "model_failure_concentration"
    | "feature_volume_anomaly";
  severity: "info" | "warning" | "critical";
  title: string;
  whatChanged: string;
  observed: number;
  baseline: number;
  delta: number;
  window: string;
  detectedAt: string;
  entity?: string | null;
};

export type DependencyStatus =
  | "healthy"
  | "degraded"
  | "failing"
  | "unknown"
  | "not_instrumented";

export type DependencyHealth = {
  id: string;
  name: string;
  status: DependencyStatus;
  evidence: string;
  lastCheckedAt: string;
};

export type QueueMetric = {
  id: string;
  name: string;
  depth: MetricResult<number>;
  oldestAgeMs: MetricResult<number>;
  throughput24h: MetricResult<number>;
  successRate: MetricResult<number>;
  failureRate: MetricResult<number>;
  retryRate: MetricResult<number>;
  source: string;
};

export type JobHealthMetric = {
  queued: MetricResult<number>;
  running: MetricResult<number>;
  succeeded: MetricResult<number>;
  failed: MetricResult<number>;
  retrying: MetricResult<number>;
  stale: MetricResult<number>;
  avgDurationMs: MetricResult<number>;
  p95DurationMs: MetricResult<number>;
  retryRate: MetricResult<number>;
  failureRate: MetricResult<number>;
  staleThresholdMs: number;
  sampleSize: number;
};

export type StaleJobRow = {
  id: string;
  status: string;
  jobType: string | null;
  workspaceId: string | null;
  updatedAt: string;
  ageMs: number;
  staleThresholdMs: number;
};

export type InfrastructureOverview = {
  systemStatus: "healthy" | "degraded" | "critical" | "unknown";
  systemStatusReason: string;
  failedJobs24h: MetricResult<number>;
  staleJobs: MetricResult<number>;
  queueDepth: MetricResult<number>;
  openAlerts: MetricResult<number>;
  criticalAlerts: MetricResult<number>;
  aiErrorRate: MetricResult<number>;
  dependencies: DependencyHealth[];
  attention: Array<{ id: string; severity: string; title: string; href: string }>;
};

export type ObservabilityEvent = {
  id: string;
  occurredAt: string;
  category: "ai" | "import" | "publish" | "webhook" | "cron" | "system" | "auth" | "billing";
  severity: "info" | "warning" | "critical";
  source: string;
  entityType: string | null;
  entityId: string | null;
  workspaceId: string | null;
  userId: string | null;
  correlationId: string | null;
  message: string;
};

export type CronScheduleInfo = {
  id: string;
  name: string;
  path: string;
  /** Configuration only — not evidence of successful execution. */
  configuredSchedule: string;
  executionHistory: MetricResult<null>;
};

export type AlertThresholdView = {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
};

export type AlertEvaluationResult = {
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  operator: string;
  fired: boolean;
  severity: string;
  suppressedDuplicate: boolean;
};
