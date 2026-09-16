/**
 * Phase 6 analytics performance bounds.
 * No unbounded scans; callers must clamp ranges before querying.
 */

import type { DateRangePreset } from "@/lib/admin/dates";

/** Default analytics window. */
export const DEFAULT_ANALYTICS_PRESET = "30d" as const;

/** Maximum inclusive span for analytics queries (days). */
export const MAX_ANALYTICS_DAYS = 90;

/** Soft cap on row samples pulled for client-side percentile / cohort math. */
export const ANALYTICS_SAMPLE_CAP = 5000;

/** Minimum cohort size before retention % is shown. */
export const MIN_COHORT_SIZE = 5;

/** Minimum samples for latency percentiles in AI intelligence. */
export const MIN_LATENCY_SAMPLES = 20;

/** Minimum recent AI requests before anomaly rules fire. */
export const MIN_ANOMALY_REQUESTS = 20;

/** Days without activity → dormant (lifecycle). */
export const DORMANT_DAYS = 30;

/** Days without activity → at-risk inactivity signal. */
export const AT_RISK_INACTIVITY_DAYS = 14;

/** Cap on founder insights returned to the dashboard. */
export const FOUNDER_INSIGHTS_CAP = 5;

/** Clamp preset so analytics never exceed MAX_ANALYTICS_DAYS. */
export function clampAnalyticsPreset(
  preset: DateRangePreset | undefined,
): DateRangePreset {
  const p = preset ?? DEFAULT_ANALYTICS_PRESET;
  if (p === "6m" || p === "12m") return "90d";
  if (p === "custom") return "30d";
  return p;
}
