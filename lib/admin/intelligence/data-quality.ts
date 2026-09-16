/**
 * Data quality checks — separate from business metrics.
 */

export type DataQualityIssue = {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  count: number | null;
};

export type DataQualityInput = {
  eventsMissingTimestamp: number;
  eventsInvalidUserRef: number;
  eventsDuplicateFingerprints: number;
  staleTelemetryHours: number | null;
  aiUsageMissingCost: number;
  billingAmountMissing: boolean;
  productEventsSampleSize: number;
};

export function assessDataQuality(input: DataQualityInput): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  if (input.eventsMissingTimestamp > 0) {
    issues.push({
      code: "missing_event_timestamps",
      severity: "warning",
      title: "Events missing timestamps",
      detail: "product_events rows with null/invalid occurred_at",
      count: input.eventsMissingTimestamp,
    });
  }

  if (input.eventsInvalidUserRef > 0) {
    issues.push({
      code: "invalid_user_refs",
      severity: "info",
      title: "Events with unresolved user_id",
      detail: "user_id present but no matching profiles row (sample)",
      count: input.eventsInvalidUserRef,
    });
  }

  if (input.eventsDuplicateFingerprints > 0) {
    issues.push({
      code: "duplicate_events",
      severity: "info",
      title: "Possible duplicate product events",
      detail: "Same user/workspace/event_name within 1s window (heuristic)",
      count: input.eventsDuplicateFingerprints,
    });
  }

  if (input.staleTelemetryHours != null && input.staleTelemetryHours >= 24) {
    issues.push({
      code: "stale_telemetry",
      severity: input.staleTelemetryHours >= 72 ? "critical" : "warning",
      title: "Stale product telemetry",
      detail: `No product_events for ${input.staleTelemetryHours}h`,
      count: null,
    });
  }

  if (input.aiUsageMissingCost > 0) {
    issues.push({
      code: "missing_ai_cost",
      severity: "info",
      title: "AI usage rows without cost",
      detail: "estimated_cost null — cost trends partial",
      count: input.aiUsageMissingCost,
    });
  }

  if (input.billingAmountMissing) {
    issues.push({
      code: "missing_billing_data",
      severity: "info",
      title: "Billing amounts unavailable",
      detail: "No amount/currency columns wired — Revenue unavailable",
      count: null,
    });
  }

  if (input.productEventsSampleSize === 0) {
    issues.push({
      code: "no_product_events",
      severity: "warning",
      title: "No product events in window",
      detail: "Instrumentation may be incomplete for engagement analytics",
      count: 0,
    });
  }

  return issues;
}
