import "server-only";

/**
 * Centralized operations thresholds for stale jobs / queues.
 * Keep dashboard-strip and phase4-queries in sync via these constants.
 */
export const OPS_THRESHOLDS_MS = {
  /** Queued / pending jobs older than this are stale. */
  defaultQueued: 60 * 60 * 1000,
  /** Running jobs older than this are stale (generic). */
  defaultRunning: 30 * 60 * 1000,
  /** Instagram import running analysis can take longer. */
  importAnalyze: 45 * 60 * 1000,
  /** Worker claim staleness when reclaiming locked jobs. */
  workerClaimStale: 10 * 60 * 1000,
} as const;

export const OPS_RETRY = {
  /** Default max attempts for import_jobs when column missing. */
  defaultMaxAttempts: 3,
  /** Non-retryable error codes (deterministic). */
  nonRetryableCodes: [
    "UNAUTHORIZED",
    "FORBIDDEN",
    "VALIDATION",
    "INVALID_INPUT",
    "NOT_FOUND",
    "UNSUPPORTED",
  ] as readonly string[],
} as const;

export function isRetryableErrorCode(code: string | null | undefined): boolean {
  if (!code) return true;
  const normalized = code.trim().toUpperCase();
  return !OPS_RETRY.nonRetryableCodes.some(
    (c) => normalized === c || normalized.includes(c),
  );
}

export function staleThresholdMs(input: {
  jobType?: string | null;
  status?: string | null;
}): number {
  const status = (input.status ?? "").toLowerCase();
  if (status === "queued" || status === "pending" || status === "retrying") {
    return OPS_THRESHOLDS_MS.defaultQueued;
  }
  const type = (input.jobType ?? "").toLowerCase();
  if (type === "instagram_import" || type === "import") {
    return OPS_THRESHOLDS_MS.importAnalyze;
  }
  return OPS_THRESHOLDS_MS.defaultRunning;
}
