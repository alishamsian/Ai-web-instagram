/**
 * Rule-based at-risk detection — every flag includes reason + evidence.
 */

import { AT_RISK_INACTIVITY_DAYS } from "@/lib/admin/intelligence/limits";

export type RiskSeverity = "low" | "medium" | "high";

export type RiskFlag = {
  code: string;
  severity: RiskSeverity;
  reason: string;
  evidence: string;
  lastActivityAt: string | null;
};

export type AtRiskInput = {
  daysSinceActivity: number | null;
  lastActivityAt: string | null;
  hasPublishedWebsite: boolean;
  hasWebsite: boolean;
  successfulImports: number;
  failedImports: number;
  failedJobsRecent: number;
  publishingFailuresRecent: number;
  ageDays: number;
  /** Prior period activity count vs recent (for sudden drop). null = unknown */
  activityRecent: number | null;
  activityPrevious: number | null;
};

export function detectAtRisk(input: AtRiskInput): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const last = input.lastActivityAt;

  if (
    input.daysSinceActivity != null &&
    input.daysSinceActivity >= AT_RISK_INACTIVITY_DAYS
  ) {
    flags.push({
      code: "no_activity",
      severity: input.daysSinceActivity >= 30 ? "high" : "medium",
      reason: `No activity for ${input.daysSinceActivity} days`,
      evidence: `days_since_activity=${input.daysSinceActivity}`,
      lastActivityAt: last,
    });
  }

  if (input.ageDays >= 7 && !input.hasPublishedWebsite && input.successfulImports === 0) {
    flags.push({
      code: "incomplete_activation",
      severity: input.ageDays >= 21 ? "high" : "medium",
      reason: "Incomplete activation after signup window",
      evidence: `age_days=${input.ageDays}; published=0; successful_imports=0`,
      lastActivityAt: last,
    });
  }

  if (
    input.hasPublishedWebsite &&
    input.daysSinceActivity != null &&
    input.daysSinceActivity >= AT_RISK_INACTIVITY_DAYS
  ) {
    flags.push({
      code: "published_then_inactive",
      severity: "high",
      reason: "Published then became inactive",
      evidence: `published=true; days_since_activity=${input.daysSinceActivity}`,
      lastActivityAt: last,
    });
  }

  if (input.failedImports >= 3 && input.successfulImports === 0) {
    flags.push({
      code: "repeated_import_failure",
      severity: "high",
      reason: "Repeated import failures with no success",
      evidence: `failed_imports=${input.failedImports}; successful=0`,
      lastActivityAt: last,
    });
  }

  if (input.publishingFailuresRecent >= 3) {
    flags.push({
      code: "repeated_publishing_failure",
      severity: "medium",
      reason: "Repeated publishing failures",
      evidence: `publishing_failures_recent=${input.publishingFailuresRecent}`,
      lastActivityAt: last,
    });
  }

  if (input.failedJobsRecent >= 5) {
    flags.push({
      code: "high_error_rate",
      severity: "high",
      reason: "High recent job failure count",
      evidence: `failed_jobs_recent=${input.failedJobsRecent}`,
      lastActivityAt: last,
    });
  }

  if (
    input.activityRecent != null &&
    input.activityPrevious != null &&
    input.activityPrevious >= 5 &&
    input.activityRecent / input.activityPrevious <= 0.3
  ) {
    flags.push({
      code: "sudden_usage_drop",
      severity: "medium",
      reason: "Sudden drop in activity vs prior period",
      evidence: `recent=${input.activityRecent}; previous=${input.activityPrevious}`,
      lastActivityAt: last,
    });
  }

  return flags;
}
