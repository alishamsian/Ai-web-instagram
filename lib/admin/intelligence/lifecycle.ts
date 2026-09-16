/**
 * Lifecycle stages — deterministic rules (no ML).
 * Transitions are explainable from evidence fields.
 */

import { AT_RISK_INACTIVITY_DAYS, DORMANT_DAYS } from "@/lib/admin/intelligence/limits";

export type LifecycleStage =
  | "new"
  | "onboarding"
  | "activated"
  | "engaged"
  | "power_user"
  | "dormant"
  | "at_risk";

export type LifecycleInput = {
  /** Days since profile/workspace created */
  ageDays: number;
  hasWebsite: boolean;
  hasPublishedWebsite: boolean;
  successfulImports: number;
  daysSinceActivity: number | null;
  aiRequestsRecent: number;
  publicationCount: number;
  websiteCount: number;
  healthCategory: "healthy" | "neutral" | "at_risk" | "insufficient_data";
};

export type LifecycleResult = {
  stage: LifecycleStage;
  reasons: string[];
};

export function resolveLifecycle(input: LifecycleInput): LifecycleResult {
  const reasons: string[] = [];

  // At-risk / dormant take precedence when evidence exists
  if (
    input.daysSinceActivity != null &&
    input.daysSinceActivity >= DORMANT_DAYS &&
    input.hasPublishedWebsite
  ) {
    reasons.push(`inactive_${input.daysSinceActivity}d_after_publish`);
    return { stage: "dormant", reasons };
  }

  if (
    input.healthCategory === "at_risk" ||
    (input.daysSinceActivity != null &&
      input.daysSinceActivity >= AT_RISK_INACTIVITY_DAYS &&
      input.hasWebsite)
  ) {
    reasons.push(
      input.healthCategory === "at_risk"
        ? "health_category=at_risk"
        : `inactive_${input.daysSinceActivity}d`,
    );
    return { stage: "at_risk", reasons };
  }

  const powerSignals =
    (input.websiteCount >= 2 ? 1 : 0) +
    (input.publicationCount >= 3 ? 1 : 0) +
    (input.aiRequestsRecent >= 10 ? 1 : 0) +
    (input.successfulImports >= 2 ? 1 : 0);

  if (powerSignals >= 2 && input.hasPublishedWebsite) {
    reasons.push(`power_signals=${powerSignals}`);
    return { stage: "power_user", reasons };
  }

  if (
    input.hasPublishedWebsite &&
    input.daysSinceActivity != null &&
    input.daysSinceActivity <= 7
  ) {
    reasons.push("published_and_active_7d");
    return { stage: "engaged", reasons };
  }

  if (input.hasPublishedWebsite || input.successfulImports > 0) {
    reasons.push(
      input.hasPublishedWebsite
        ? "has_published_website"
        : "has_successful_import",
    );
    return { stage: "activated", reasons };
  }

  if (input.hasWebsite || input.ageDays <= 7) {
    reasons.push(
      input.hasWebsite ? "has_website_not_activated" : `age_days=${input.ageDays}`,
    );
    return { stage: "onboarding", reasons };
  }

  if (input.ageDays <= 3) {
    reasons.push(`age_days=${input.ageDays}`);
    return { stage: "new", reasons };
  }

  reasons.push("no_activation_signals");
  return { stage: "onboarding", reasons };
}
