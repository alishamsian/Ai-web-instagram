/**
 * Paid conversion — signup→paid and activated→paid.
 * Pure math with maturity gates. Never invent 0% for immature cohorts.
 */

import { ACTIVATION_WINDOW_DAYS } from "@/lib/admin/intelligence/limits";

export const PAID_CONVERSION_WINDOW_DAYS = 60;

export type PaidConversionMember = {
  userId: string;
  signupAt: string;
  activatedAt: string | null;
  paidAt: string | null;
};

export type PaidConversionResult = {
  status: "available" | "partial" | "pending" | "insufficient_data";
  cohortSize: number;
  converted: number;
  rate: number | null;
  medianHoursToPaid: number | null;
  p50HoursToPaid: number | null;
  p95HoursToPaid: number | null;
  reason?: string;
  definition: string;
};

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length < 5 && p >= 0.95) return null; // need min sample for p95
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[idx] ?? null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? null;
}

export function computeSignupToPaid(input: {
  members: PaidConversionMember[];
  cutoff: string;
  windowDays?: number;
  minCohortSize?: number;
  truncated?: boolean;
}): PaidConversionResult {
  const windowDays = input.windowDays ?? PAID_CONVERSION_WINDOW_DAYS;
  const minSize = input.minCohortSize ?? 5;
  const definition = `signup → first paid subscription within ${windowDays}d; paidAt ≤ cutoff; mature when cutoff ≥ signup + ${windowDays}d`;

  const mature = input.members.filter((m) => {
    const matureAt = addDays(m.signupAt, windowDays);
    return matureAt <= input.cutoff;
  });

  if (mature.length === 0 && input.members.length > 0) {
    return {
      status: "pending",
      cohortSize: input.members.length,
      converted: 0,
      rate: null,
      medianHoursToPaid: null,
      p50HoursToPaid: null,
      p95HoursToPaid: null,
      reason: "cohort_not_mature",
      definition,
    };
  }

  if (mature.length < minSize) {
    return {
      status: "insufficient_data",
      cohortSize: mature.length,
      converted: 0,
      rate: null,
      medianHoursToPaid: null,
      p50HoursToPaid: null,
      p95HoursToPaid: null,
      reason: `mature_cohort_size=${mature.length}<${minSize}`,
      definition,
    };
  }

  const convertedMembers = mature.filter((m) => {
    if (!m.paidAt) return false;
    if (m.paidAt < m.signupAt) return false;
    if (m.paidAt > input.cutoff) return false;
    const windowEnd = addDays(m.signupAt, windowDays);
    return m.paidAt <= windowEnd;
  });

  const hours = convertedMembers
    .map((m) => hoursBetween(m.signupAt, m.paidAt!))
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);

  const rate = convertedMembers.length / mature.length;
  const status = input.truncated ? "partial" : "available";

  return {
    status,
    cohortSize: mature.length,
    converted: convertedMembers.length,
    rate,
    medianHoursToPaid: median(hours),
    p50HoursToPaid: percentile(hours, 0.5),
    p95HoursToPaid: percentile(hours, 0.95),
    reason: input.truncated ? "sample_truncated" : undefined,
    definition,
  };
}

export function computeActivatedToPaid(input: {
  members: PaidConversionMember[];
  cutoff: string;
  windowDays?: number;
  minCohortSize?: number;
  truncated?: boolean;
}): PaidConversionResult {
  const windowDays = input.windowDays ?? PAID_CONVERSION_WINDOW_DAYS;
  const minSize = input.minCohortSize ?? 5;
  const definition = `activated → paid within ${windowDays}d of activation; activation uses Phase 6 window ${ACTIVATION_WINDOW_DAYS}d`;

  const activated = input.members.filter((m) => m.activatedAt != null);
  const mature = activated.filter((m) => {
    const matureAt = addDays(m.activatedAt!, windowDays);
    return matureAt <= input.cutoff;
  });

  if (mature.length === 0 && activated.length > 0) {
    return {
      status: "pending",
      cohortSize: activated.length,
      converted: 0,
      rate: null,
      medianHoursToPaid: null,
      p50HoursToPaid: null,
      p95HoursToPaid: null,
      reason: "cohort_not_mature",
      definition,
    };
  }

  if (mature.length < minSize) {
    return {
      status: "insufficient_data",
      cohortSize: mature.length,
      converted: 0,
      rate: null,
      medianHoursToPaid: null,
      p50HoursToPaid: null,
      p95HoursToPaid: null,
      reason: `mature_activated_size=${mature.length}<${minSize}`,
      definition,
    };
  }

  const convertedMembers = mature.filter((m) => {
    if (!m.paidAt || !m.activatedAt) return false;
    if (m.paidAt < m.activatedAt) return false;
    if (m.paidAt > input.cutoff) return false;
    return m.paidAt <= addDays(m.activatedAt, windowDays);
  });

  const hours = convertedMembers
    .map((m) => hoursBetween(m.activatedAt!, m.paidAt!))
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);

  return {
    status: input.truncated ? "partial" : "available",
    cohortSize: mature.length,
    converted: convertedMembers.length,
    rate: convertedMembers.length / mature.length,
    medianHoursToPaid: median(hours),
    p50HoursToPaid: percentile(hours, 0.5),
    p95HoursToPaid: percentile(hours, 0.95),
    reason: input.truncated ? "sample_truncated" : undefined,
    definition,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
