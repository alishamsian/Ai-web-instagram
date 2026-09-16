/**
 * Pure activation / funnel / retention helpers (unit-testable, no I/O).
 */

import { MIN_COHORT_SIZE } from "@/lib/admin/intelligence/limits";

export type ActivationDefinition = {
  id: "v1_publish_or_successful_import";
  description: string;
  eligibleDenominator: "profiles_in_range" | "workspaces_in_range";
};

export const ACTIVATION_DEFINITION: ActivationDefinition = {
  id: "v1_publish_or_successful_import",
  description:
    "Activated when the user/workspace has at least one published website OR at least one successful Instagram import. Derived from websites + instagram_imports / import_jobs tables (not invented events).",
  eligibleDenominator: "profiles_in_range",
};

export type FunnelStepId =
  | "signup"
  | "import_completed"
  | "website_generated"
  | "website_previewed"
  | "website_published";

export type FunnelStepStat = {
  id: FunnelStepId;
  label: string;
  users: number | null;
  workspaces: number | null;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number | null;
  medianHoursToNext: number | null;
  status: "available" | "partial" | "unavailable";
  reason?: string;
  source: string;
};

/** Median of numbers; null if empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function conversionRate(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function retentionPercent(
  retained: number,
  cohortSize: number,
): { status: "available" | "insufficient_data"; value: number | null; reason?: string } {
  if (cohortSize < MIN_COHORT_SIZE) {
    return {
      status: "insufficient_data",
      value: null,
      reason: `cohort_size=${cohortSize} < min=${MIN_COHORT_SIZE}`,
    };
  }
  return { status: "available", value: retained / cohortSize };
}

/** UTC week key YYYY-Www (ISO-ish: Monday-based week of year). */
export function utcWeekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  return Math.floor((b - a) / 86_400_000);
}

/** True if activityIso falls on day offset N after signup (UTC calendar day). */
export function isRetainedOnDay(
  signupIso: string,
  activityIso: string,
  dayOffset: number,
): boolean {
  const signupDay = Date.UTC(
    new Date(signupIso).getUTCFullYear(),
    new Date(signupIso).getUTCMonth(),
    new Date(signupIso).getUTCDate(),
  );
  const activityDay = Date.UTC(
    new Date(activityIso).getUTCFullYear(),
    new Date(activityIso).getUTCMonth(),
    new Date(activityIso).getUTCDate(),
  );
  const diff = Math.round((activityDay - signupDay) / 86_400_000);
  return diff === dayOffset;
}

export function isRetainedInWeek(
  signupIso: string,
  activityIso: string,
  weekOffset: number,
): boolean {
  const days = daysBetween(signupIso, activityIso);
  if (days < 0) return false;
  const week = Math.floor(days / 7);
  return week === weekOffset;
}
