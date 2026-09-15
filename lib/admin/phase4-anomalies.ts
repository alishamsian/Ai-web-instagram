/**
 * Deterministic AI anomaly rules — explainable, no ML theater.
 */

import type { AIAnomaly } from "@/lib/admin/phase4-contracts";

export type AnomalyWindowStats = {
  /** Recent window */
  recentRequests: number;
  recentFailures: number;
  recentErrorRate: number;
  recentP95: number | null;
  recentTokens: number | null;
  recentCost: number | null;
  /** Baseline window (earlier period of similar length) */
  baselineRequests: number;
  baselineFailures: number;
  baselineErrorRate: number;
  baselineP95: number | null;
  baselineTokens: number | null;
  baselineCost: number | null;
  /** Per-model failure shares in recent window */
  modelFailureShare: Array<{ model: string; share: number; failures: number }>;
  /** Per-feature volume delta */
  featureVolume: Array<{
    feature: string;
    recent: number;
    baseline: number;
  }>;
  windowLabel: string;
  detectedAt: string;
};

export type AnomalyThresholds = {
  errorRateAbs: number;
  errorRateDelta: number;
  latencyDeltaRatio: number;
  tokenDeltaRatio: number;
  costDeltaRatio: number;
  modelFailureShare: number;
  featureVolumeDeltaRatio: number;
  minRecentRequests: number;
};

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyThresholds = {
  errorRateAbs: 0.25,
  errorRateDelta: 0.15,
  latencyDeltaRatio: 1.5,
  tokenDeltaRatio: 2.5,
  costDeltaRatio: 2.5,
  modelFailureShare: 0.7,
  featureVolumeDeltaRatio: 3,
  minRecentRequests: 20,
};

function severityFromDelta(delta: number, warn: number, crit: number): AIAnomaly["severity"] {
  if (delta >= crit) return "critical";
  if (delta >= warn) return "warning";
  return "info";
}

export function detectAiAnomalies(
  stats: AnomalyWindowStats,
  thresholds: AnomalyThresholds = DEFAULT_ANOMALY_THRESHOLDS,
): AIAnomaly[] {
  const out: AIAnomaly[] = [];
  const at = stats.detectedAt;

  if (stats.recentRequests < thresholds.minRecentRequests) {
    return out;
  }

  // Error spike
  const errorDelta = stats.recentErrorRate - stats.baselineErrorRate;
  if (
    stats.recentErrorRate >= thresholds.errorRateAbs ||
    errorDelta >= thresholds.errorRateDelta
  ) {
    out.push({
      id: `error_spike:${stats.windowLabel}`,
      kind: "error_spike",
      severity: severityFromDelta(errorDelta, thresholds.errorRateDelta, thresholds.errorRateDelta * 2),
      title: "AI error rate spike",
      whatChanged: "Recent error rate exceeded baseline / absolute threshold",
      observed: stats.recentErrorRate,
      baseline: stats.baselineErrorRate,
      delta: errorDelta,
      window: stats.windowLabel,
      detectedAt: at,
    });
  }

  // Latency spike
  if (
    stats.recentP95 != null &&
    stats.baselineP95 != null &&
    stats.baselineP95 > 0 &&
    stats.recentP95 / stats.baselineP95 >= thresholds.latencyDeltaRatio
  ) {
    const ratio = stats.recentP95 / stats.baselineP95;
    out.push({
      id: `latency_spike:${stats.windowLabel}`,
      kind: "latency_spike",
      severity: severityFromDelta(ratio - 1, 0.5, 1.5),
      title: "AI p95 latency spike",
      whatChanged: "Recent p95 exceeded baseline by configured ratio",
      observed: stats.recentP95,
      baseline: stats.baselineP95,
      delta: stats.recentP95 - stats.baselineP95,
      window: stats.windowLabel,
      detectedAt: at,
    });
  }

  // Token spike
  if (
    stats.recentTokens != null &&
    stats.baselineTokens != null &&
    stats.baselineTokens > 0 &&
    stats.recentTokens / stats.baselineTokens >= thresholds.tokenDeltaRatio
  ) {
    const ratio = stats.recentTokens / stats.baselineTokens;
    out.push({
      id: `token_spike:${stats.windowLabel}`,
      kind: "token_spike",
      severity: severityFromDelta(ratio - 1, 1.5, 3),
      title: "AI token usage spike",
      whatChanged: "Recent token volume exceeded baseline",
      observed: stats.recentTokens,
      baseline: stats.baselineTokens,
      delta: stats.recentTokens - stats.baselineTokens,
      window: stats.windowLabel,
      detectedAt: at,
    });
  }

  // Cost spike — only when both windows have real cost
  if (
    stats.recentCost != null &&
    stats.baselineCost != null &&
    stats.baselineCost > 0 &&
    stats.recentCost / stats.baselineCost >= thresholds.costDeltaRatio
  ) {
    const ratio = stats.recentCost / stats.baselineCost;
    out.push({
      id: `cost_spike:${stats.windowLabel}`,
      kind: "cost_spike",
      severity: severityFromDelta(ratio - 1, 1.5, 3),
      title: "AI cost spike",
      whatChanged: "Recent verified cost exceeded baseline",
      observed: stats.recentCost,
      baseline: stats.baselineCost,
      delta: stats.recentCost - stats.baselineCost,
      window: stats.windowLabel,
      detectedAt: at,
    });
  }

  // Model failure concentration
  for (const m of stats.modelFailureShare) {
    if (
      m.failures >= 5 &&
      m.share >= thresholds.modelFailureShare &&
      stats.recentFailures >= 5
    ) {
      out.push({
        id: `model_fail:${m.model}:${stats.windowLabel}`,
        kind: "model_failure_concentration",
        severity: m.share >= 0.9 ? "critical" : "warning",
        title: "Model failure concentration",
        whatChanged: `Model ${m.model} accounts for abnormal share of failures`,
        observed: m.share,
        baseline: 1 / Math.max(1, stats.modelFailureShare.length),
        delta: m.share - 1 / Math.max(1, stats.modelFailureShare.length),
        window: stats.windowLabel,
        detectedAt: at,
        entity: m.model,
      });
    }
  }

  // Feature volume anomaly
  for (const f of stats.featureVolume) {
    if (
      f.baseline >= thresholds.minRecentRequests / 2 &&
      f.recent / Math.max(1, f.baseline) >= thresholds.featureVolumeDeltaRatio
    ) {
      const ratio = f.recent / Math.max(1, f.baseline);
      out.push({
        id: `feature_vol:${f.feature}:${stats.windowLabel}`,
        kind: "feature_volume_anomaly",
        severity: severityFromDelta(ratio - 1, 2, 4),
        title: "Feature request volume anomaly",
        whatChanged: `Feature ${f.feature} request volume changed abruptly`,
        observed: f.recent,
        baseline: f.baseline,
        delta: f.recent - f.baseline,
        window: stats.windowLabel,
        detectedAt: at,
        entity: f.feature,
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return out.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

/** Pure helper: percentile from sorted ascending array. */
export function percentileSorted(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? null;
}

export const LATENCY_P95_MIN_SAMPLES = 20;
export const LATENCY_P99_MIN_SAMPLES = 20;
export const LATENCY_P50_MIN_SAMPLES = 5;
