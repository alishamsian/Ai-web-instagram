/**
 * Pure activation / funnel / retention helpers (unit-testable, no I/O).
 */

import {
  ACTIVATION_WINDOW_DAYS,
  MIN_COHORT_SIZE,
} from "@/lib/admin/intelligence/limits";

export type ActivationDefinition = {
  id: "v1_publish_or_successful_import_within_window";
  description: string;
  eligibleDenominator: "profiles_in_range" | "workspaces_in_range";
  windowDays: number;
};

export const ACTIVATION_DEFINITION: ActivationDefinition = {
  id: "v1_publish_or_successful_import_within_window",
  description:
    `Activated when, within ${ACTIVATION_WINDOW_DAYS} days after signup, the user/workspace achieves at least one successful Instagram import (import_jobs.status=completed) OR a published website (published_at). Activation timestamps must be ≥ signup and ≤ signup+${ACTIVATION_WINDOW_DAYS}d, and ≤ analysis cutoff.`,
  eligibleDenominator: "profiles_in_range",
  windowDays: ACTIVATION_WINDOW_DAYS,
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
  status: "available" | "partial" | "unavailable" | "insufficient_data";
  reason?: string;
  source: string;
};

/** Per-workspace timestamps for causal funnel evaluation. */
export type FunnelWorkspaceEvents = {
  workspaceId: string;
  createdAt: string;
  /** Earliest completed import in window */
  importCompletedAt: string | null;
  /** Earliest website.created_at in window (= generation semantic) */
  websiteGeneratedAt: string | null;
  /** Earliest website_edited proxy (optional) */
  previewProxyAt: string | null;
  /** Earliest published_at in window */
  publishedAt: string | null;
};

/**
 * Causal funnel (product path):
 * signup → successful import → website generation → publish
 *
 * Rules:
 * - each stage ≥ previous stage timestamp
 * - each stage within [createdAt, createdAt+window] and ≤ cutoff
 * - generation semantic = websites.created_at (earliest valid)
 * - publish requires published_at ≥ generation
 *
 * Preview is NOT on the critical path (no dedicated telemetry).
 * Preview proxy counts are computed separately among generated workspaces.
 */
export function computeCausalFunnel(input: {
  workspaces: FunnelWorkspaceEvents[];
  windowDays?: number;
  cutoffAt: string;
}): {
  signup: number;
  imported: number;
  generated: number;
  previewProxy: number;
  published: number;
} {
  const windowDays = input.windowDays ?? ACTIVATION_WINDOW_DAYS;
  let imported = 0;
  let generated = 0;
  let previewProxy = 0;
  let published = 0;

  for (const ws of input.workspaces) {
    const importAt = firstValidActivationAt({
      signupAt: ws.createdAt,
      candidates: [ws.importCompletedAt],
      windowDays,
      cutoffAt: input.cutoffAt,
    });
    if (!importAt) continue;
    imported += 1;

    const genAt = firstValidActivationAt({
      signupAt: ws.createdAt,
      candidates: [ws.websiteGeneratedAt],
      windowDays,
      cutoffAt: input.cutoffAt,
    });
    if (!genAt || Date.parse(genAt) < Date.parse(importAt)) continue;
    generated += 1;

    const previewAt = firstValidActivationAt({
      signupAt: ws.createdAt,
      candidates: [ws.previewProxyAt],
      windowDays,
      cutoffAt: input.cutoffAt,
    });
    if (previewAt && Date.parse(previewAt) >= Date.parse(genAt)) {
      previewProxy += 1;
    }

    const pubAt = firstValidActivationAt({
      signupAt: ws.createdAt,
      candidates: [ws.publishedAt],
      windowDays,
      cutoffAt: input.cutoffAt,
    });
    if (!pubAt || Date.parse(pubAt) < Date.parse(genAt)) continue;
    published += 1;
  }

  return {
    signup: input.workspaces.length,
    imported,
    generated,
    previewProxy,
    published,
  };
}

export function funnelStageConversion(
  current: number,
  previous: number,
): {
  rate: number | null;
  status: "available" | "insufficient_data";
  reason?: string;
} {
  if (previous <= 0) {
    return {
      rate: null,
      status: "insufficient_data",
      reason: "Previous funnel stage has zero eligible workspaces",
    };
  }
  return { rate: current / previous, status: "available" };
}

/** UTC calendar-day maturity: cutoff must be ≥ signupDay + dayOffset. */
export function isRetentionDayMature(
  signupAt: string,
  dayOffset: number,
  cutoffAt: string,
): boolean {
  const signup = new Date(signupAt);
  const cutoff = new Date(cutoffAt);
  const signupDay = Date.UTC(
    signup.getUTCFullYear(),
    signup.getUTCMonth(),
    signup.getUTCDate(),
  );
  const cutoffDay = Date.UTC(
    cutoff.getUTCFullYear(),
    cutoff.getUTCMonth(),
    cutoff.getUTCDate(),
  );
  const elapsed = Math.round((cutoffDay - signupDay) / 86_400_000);
  return elapsed >= dayOffset;
}

export function isRetentionWeekMature(
  signupAt: string,
  weekOffset: number,
  cutoffAt: string,
): boolean {
  return isRetentionDayMature(signupAt, weekOffset * 7, cutoffAt);
}

export type RetentionCellStatus =
  | "available"
  | "insufficient_data"
  | "pending"
  | "partial";

export function computeRetentionDayCell(input: {
  profiles: Array<{ id: string; created_at: string }>;
  activitiesByUser: Map<string, string[]>;
  dayOffset: number;
  cutoffAt: string;
}): {
  status: RetentionCellStatus;
  retained: number | null;
  cohortSize: number;
  matureSize: number;
  rate: number | null;
  reason?: string;
} {
  const mature = input.profiles.filter((p) =>
    isRetentionDayMature(p.created_at, input.dayOffset, input.cutoffAt),
  );
  if (mature.length === 0) {
    return {
      status: "pending",
      retained: null,
      cohortSize: input.profiles.length,
      matureSize: 0,
      rate: null,
      reason: `No cohort members have matured for Day ${input.dayOffset} yet (cutoff=${input.cutoffAt})`,
    };
  }
  if (mature.length < MIN_COHORT_SIZE) {
    return {
      status: "insufficient_data",
      retained: null,
      cohortSize: input.profiles.length,
      matureSize: mature.length,
      rate: null,
      reason: `mature_size=${mature.length} < min=${MIN_COHORT_SIZE}`,
    };
  }

  let retained = 0;
  for (const p of mature) {
    const acts = (input.activitiesByUser.get(p.id) ?? []).filter(
      (a) => Date.parse(a) <= Date.parse(input.cutoffAt),
    );
    if (acts.some((a) => isRetainedOnDay(p.created_at, a, input.dayOffset))) {
      retained += 1;
    }
  }
  return {
    status: "available",
    retained,
    cohortSize: input.profiles.length,
    matureSize: mature.length,
    rate: retained / mature.length,
  };
}

export function computeRetentionWeekCell(input: {
  profiles: Array<{ id: string; created_at: string }>;
  activitiesByUser: Map<string, string[]>;
  weekOffset: number;
  cutoffAt: string;
}): {
  status: RetentionCellStatus;
  retained: number | null;
  cohortSize: number;
  matureSize: number;
  rate: number | null;
  reason?: string;
} {
  const mature = input.profiles.filter((p) =>
    isRetentionWeekMature(p.created_at, input.weekOffset, input.cutoffAt),
  );
  if (mature.length === 0) {
    return {
      status: "pending",
      retained: null,
      cohortSize: input.profiles.length,
      matureSize: 0,
      rate: null,
      reason: `No cohort members have matured for W${input.weekOffset} yet`,
    };
  }
  if (mature.length < MIN_COHORT_SIZE) {
    return {
      status: "insufficient_data",
      retained: null,
      cohortSize: input.profiles.length,
      matureSize: mature.length,
      rate: null,
      reason: `mature_size=${mature.length} < min=${MIN_COHORT_SIZE}`,
    };
  }

  let retained = 0;
  for (const p of mature) {
    const acts = (input.activitiesByUser.get(p.id) ?? []).filter(
      (a) => Date.parse(a) <= Date.parse(input.cutoffAt),
    );
    if (
      acts.some((a) => isRetainedInWeek(p.created_at, a, input.weekOffset))
    ) {
      retained += 1;
    }
  }
  return {
    status: "available",
    retained,
    cohortSize: input.profiles.length,
    matureSize: mature.length,
    rate: retained / mature.length,
  };
}

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
): {
  status: "available" | "insufficient_data";
  value: number | null;
  reason?: string;
} {
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
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  return Math.floor((b - a) / 86_400_000);
}

export function addUtcDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * Temporal integrity for activation events.
 * Requires: signup ≤ activation ≤ signup+windowDays AND activation ≤ cutoff.
 */
export function isValidActivationTimestamp(input: {
  signupAt: string;
  activationAt: string;
  windowDays?: number;
  /** Analysis/data cutoff — never count activity after this instant. */
  cutoffAt?: string;
}): boolean {
  const signupMs = Date.parse(input.signupAt);
  const actMs = Date.parse(input.activationAt);
  if (!Number.isFinite(signupMs) || !Number.isFinite(actMs)) return false;
  if (actMs < signupMs) return false;

  const windowDays = input.windowDays ?? ACTIVATION_WINDOW_DAYS;
  const windowEndMs = signupMs + windowDays * 86_400_000;
  if (actMs > windowEndMs) return false;

  if (input.cutoffAt) {
    const cutoffMs = Date.parse(input.cutoffAt);
    if (Number.isFinite(cutoffMs) && actMs > cutoffMs) return false;
  }
  return true;
}

/** Earliest valid activation among candidates, or null. */
export function firstValidActivationAt(input: {
  signupAt: string;
  candidates: Array<string | null | undefined>;
  windowDays?: number;
  cutoffAt?: string;
}): string | null {
  let best: string | null = null;
  for (const c of input.candidates) {
    if (!c) continue;
    if (
      !isValidActivationTimestamp({
        signupAt: input.signupAt,
        activationAt: c,
        windowDays: input.windowDays,
        cutoffAt: input.cutoffAt,
      })
    ) {
      continue;
    }
    if (!best || c < best) best = c;
  }
  return best;
}

export type ActivationCohortProfile = {
  id: string;
  created_at: string;
};

export type ActivationComputeInput = {
  profiles: ActivationCohortProfile[];
  /** owner_id → workspace ids */
  workspacesByOwner: Map<string, string[]>;
  /** workspace_id → activation candidate timestamps (published / completed import) */
  activationCandidatesByWorkspace: Map<string, string[]>;
  windowDays?: number;
  cutoffAt: string;
};

export type ActivationComputeResult = {
  eligibleUsers: number;
  activatedUserIds: Set<string>;
  activatedWorkspaceIds: Set<string>;
  /** Hours from signup to first valid activation, per activated user */
  hoursToActivation: number[];
};

/**
 * Pure cohort activation — O(users + workspace links + candidates).
 * Does not scan workspaces per profile via filter.
 */
export function computeActivationCohort(
  input: ActivationComputeInput,
): ActivationComputeResult {
  const windowDays = input.windowDays ?? ACTIVATION_WINDOW_DAYS;
  const activatedUserIds = new Set<string>();
  const activatedWorkspaceIds = new Set<string>();
  const hoursToActivation: number[] = [];

  for (const profile of input.profiles) {
    const wsIds = input.workspacesByOwner.get(profile.id) ?? [];
    let first: string | null = null;
    const activatedWsForUser: string[] = [];

    for (const wsId of wsIds) {
      const candidates = input.activationCandidatesByWorkspace.get(wsId) ?? [];
      const valid = firstValidActivationAt({
        signupAt: profile.created_at,
        candidates,
        windowDays,
        cutoffAt: input.cutoffAt,
      });
      if (!valid) continue;
      activatedWsForUser.push(wsId);
      if (!first || valid < first) first = valid;
    }

    if (first) {
      activatedUserIds.add(profile.id);
      for (const wsId of activatedWsForUser) {
        activatedWorkspaceIds.add(wsId);
      }
      hoursToActivation.push(
        (Date.parse(first) - Date.parse(profile.created_at)) / 3_600_000,
      );
    }
  }

  return {
    eligibleUsers: input.profiles.length,
    activatedUserIds,
    activatedWorkspaceIds,
    hoursToActivation,
  };
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
