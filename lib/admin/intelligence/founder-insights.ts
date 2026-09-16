/**
 * Founder Insights Engine — deterministic signals only.
 * LLM must never invent facts; optional future summary stays separate.
 */

import { FOUNDER_INSIGHTS_CAP } from "@/lib/admin/intelligence/limits";

export type InsightType =
  | "activation_drop"
  | "retention_drop"
  | "error_spike"
  | "ai_degradation"
  | "queue_backlog"
  | "customer_risk"
  | "feature_adoption_change"
  | "publishing_failure_spike";

export type InsightSeverity = "info" | "warning" | "critical";

export type FounderInsight = {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  summary: string;
  evidence: string[];
  metric: string;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  affectedCount: number | null;
  generatedAt: string;
  href?: string;
};

export type FounderInsightInputs = {
  generatedAt: string;
  activationRate: number | null;
  previousActivationRate: number | null;
  day7Retention: number | null;
  previousDay7Retention: number | null;
  failedJobs24h: number | null;
  previousFailedJobs24h: number | null;
  queueDepth: number | null;
  aiErrorRate: number | null;
  previousAiErrorRate: number | null;
  atRiskCount: number | null;
  publishingFailures24h: number | null;
  previousPublishingFailures24h: number | null;
};

const ACTIVATION_DROP = 0.15;
const RETENTION_DROP = 0.1;
const ERROR_SPIKE_RATIO = 1.5;
const QUEUE_BACKLOG = 20;
const AI_ERROR_SPIKE = 0.15;
const AT_RISK_ALERT = 5;

export function generateFounderInsights(
  input: FounderInsightInputs,
): FounderInsight[] {
  const out: FounderInsight[] = [];
  const at = input.generatedAt;

  if (
    input.activationRate != null &&
    input.previousActivationRate != null &&
    input.previousActivationRate > 0 &&
    input.previousActivationRate - input.activationRate >= ACTIVATION_DROP
  ) {
    out.push({
      type: "activation_drop",
      severity: "warning",
      title: "Activation rate dropped",
      summary: "Activation rate fell vs prior comparable period",
      evidence: [
        `current=${input.activationRate}`,
        `previous=${input.previousActivationRate}`,
        `threshold_drop>=${ACTIVATION_DROP}`,
      ],
      metric: "activation_rate",
      currentValue: input.activationRate,
      previousValue: input.previousActivationRate,
      delta: input.activationRate - input.previousActivationRate,
      affectedCount: null,
      generatedAt: at,
      href: "/analytics/funnels",
    });
  }

  if (
    input.day7Retention != null &&
    input.previousDay7Retention != null &&
    input.previousDay7Retention > 0 &&
    input.previousDay7Retention - input.day7Retention >= RETENTION_DROP
  ) {
    out.push({
      type: "retention_drop",
      severity: "warning",
      title: "Day-7 retention dropped",
      summary: "Activity-based Day-7 retention fell vs prior period",
      evidence: [
        `current=${input.day7Retention}`,
        `previous=${input.previousDay7Retention}`,
      ],
      metric: "retention_d7",
      currentValue: input.day7Retention,
      previousValue: input.previousDay7Retention,
      delta: input.day7Retention - input.previousDay7Retention,
      affectedCount: null,
      generatedAt: at,
      href: "/analytics/retention",
    });
  }

  if (
    input.failedJobs24h != null &&
    input.previousFailedJobs24h != null &&
    input.previousFailedJobs24h > 0 &&
    input.failedJobs24h / input.previousFailedJobs24h >= ERROR_SPIKE_RATIO
  ) {
    out.push({
      type: "error_spike",
      severity:
        input.failedJobs24h / input.previousFailedJobs24h >= 3
          ? "critical"
          : "warning",
      title: "Job failure spike",
      summary: "Failed import jobs in 24h exceed prior window",
      evidence: [
        `failed_24h=${input.failedJobs24h}`,
        `previous=${input.previousFailedJobs24h}`,
      ],
      metric: "failed_jobs_24h",
      currentValue: input.failedJobs24h,
      previousValue: input.previousFailedJobs24h,
      delta: input.failedJobs24h - input.previousFailedJobs24h,
      affectedCount: input.failedJobs24h,
      generatedAt: at,
      href: "/jobs",
    });
  }

  if (input.queueDepth != null && input.queueDepth >= QUEUE_BACKLOG) {
    out.push({
      type: "queue_backlog",
      severity: input.queueDepth >= 50 ? "critical" : "warning",
      title: "Queue backlog",
      summary: "Queued/retrying jobs exceed backlog threshold",
      evidence: [`queue_depth=${input.queueDepth}`, `threshold=${QUEUE_BACKLOG}`],
      metric: "queue_depth",
      currentValue: input.queueDepth,
      previousValue: null,
      delta: null,
      affectedCount: input.queueDepth,
      generatedAt: at,
      href: "/ops",
    });
  }

  if (
    input.aiErrorRate != null &&
    input.previousAiErrorRate != null &&
    input.aiErrorRate - input.previousAiErrorRate >= AI_ERROR_SPIKE
  ) {
    out.push({
      type: "ai_degradation",
      severity: "warning",
      title: "AI error rate degradation",
      summary: "AI failure rate rose vs prior window (observed correlation only)",
      evidence: [
        `current_error_rate=${input.aiErrorRate}`,
        `previous=${input.previousAiErrorRate}`,
      ],
      metric: "ai_error_rate",
      currentValue: input.aiErrorRate,
      previousValue: input.previousAiErrorRate,
      delta: input.aiErrorRate - input.previousAiErrorRate,
      affectedCount: null,
      generatedAt: at,
      href: "/ai",
    });
  }

  if (input.atRiskCount != null && input.atRiskCount >= AT_RISK_ALERT) {
    out.push({
      type: "customer_risk",
      severity: input.atRiskCount >= 20 ? "critical" : "warning",
      title: "At-risk customers elevated",
      summary: "Rule-based at-risk workspace count exceeds alert threshold",
      evidence: [`at_risk_count=${input.atRiskCount}`, `threshold=${AT_RISK_ALERT}`],
      metric: "at_risk_count",
      currentValue: input.atRiskCount,
      previousValue: null,
      delta: null,
      affectedCount: input.atRiskCount,
      generatedAt: at,
      href: "/health",
    });
  }

  if (
    input.publishingFailures24h != null &&
    input.previousPublishingFailures24h != null &&
    input.previousPublishingFailures24h > 0 &&
    input.publishingFailures24h / input.previousPublishingFailures24h >=
      ERROR_SPIKE_RATIO
  ) {
    out.push({
      type: "publishing_failure_spike",
      severity: "warning",
      title: "Publishing failure spike",
      summary: "Outbound publishing failures rose vs prior window",
      evidence: [
        `current=${input.publishingFailures24h}`,
        `previous=${input.previousPublishingFailures24h}`,
      ],
      metric: "publishing_failures_24h",
      currentValue: input.publishingFailures24h,
      previousValue: input.previousPublishingFailures24h,
      delta:
        input.publishingFailures24h - input.previousPublishingFailures24h,
      affectedCount: input.publishingFailures24h,
      generatedAt: at,
      href: "/ops",
    });
  }

  const order: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return out
    .sort((a, b) => order[a.severity] - order[b.severity])
    .slice(0, FOUNDER_INSIGHTS_CAP);
}
