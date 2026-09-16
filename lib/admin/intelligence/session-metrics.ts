/**
 * Session activity metrics — DAU / WAU / MAU from user_sessions / login events.
 * Pure helpers; callers supply distinct user counts.
 */

export type ActiveUsersInput = {
  /** Distinct user ids active in the last 1 calendar day (UTC) ending at cutoff */
  dauUserIds: ReadonlySet<string>;
  /** Distinct user ids active in the last 7 days */
  wauUserIds: ReadonlySet<string>;
  /** Distinct user ids active in the last 30 days */
  mauUserIds: ReadonlySet<string>;
  /** True when underlying session telemetry table/events exist */
  telemetryAvailable: boolean;
  /** True when sample was truncated */
  truncated?: boolean;
};

export type ActiveUsersResult = {
  dau: number | null;
  wau: number | null;
  mau: number | null;
  status: "available" | "partial" | "unavailable";
  reason?: string;
  source: string;
};

export function computeActiveUsers(input: ActiveUsersInput): ActiveUsersResult {
  if (!input.telemetryAvailable) {
    return {
      dau: null,
      wau: null,
      mau: null,
      status: "unavailable",
      reason: "Session telemetry not available",
      source: "user_sessions|product_events.login|session_started",
    };
  }
  const dau = input.dauUserIds.size;
  const wau = input.wauUserIds.size;
  const mau = input.mauUserIds.size;
  if (input.truncated) {
    return {
      dau,
      wau,
      mau,
      status: "partial",
      reason: "Sample truncated — counts are lower bounds",
      source: "user_sessions",
    };
  }
  return {
    dau,
    wau,
    mau,
    status: "available",
    source: "user_sessions",
  };
}

/** Login/session retention cell with maturity gate. */
export function sessionRetentionCell(input: {
  cohortSize: number;
  retained: number;
  mature: boolean;
  minCohortSize: number;
}): {
  status: "available" | "pending" | "insufficient_data";
  rate: number | null;
  reason?: string;
} {
  if (!input.mature) {
    return { status: "pending", rate: null, reason: "cohort_not_mature" };
  }
  if (input.cohortSize < input.minCohortSize) {
    return {
      status: "insufficient_data",
      rate: null,
      reason: `cohort_size=${input.cohortSize}<${input.minCohortSize}`,
    };
  }
  return {
    status: "available",
    rate: input.retained / input.cohortSize,
  };
}
