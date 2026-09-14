/**
 * Normalized job observability helpers.
 * Compatible with existing import_jobs status vocabulary.
 */

export const JOB_STATUSES = [
  "queued",
  "running",
  "retrying",
  "completed",
  "failed",
  "cancelled",
  // Legacy import pipeline statuses (kept for compatibility)
  "scraping",
  "understanding",
  "generating",
  "persisting",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobObservabilityPatch = {
  status?: JobStatus | string;
  stage?: string | null;
  attempt?: number;
  maxAttempts?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

/** Map legacy import statuses onto the observability vocabulary. */
export function normalizeJobStatus(status: string): JobStatus | string {
  if (status === "scraping" || status === "understanding" || status === "generating" || status === "persisting") {
    return "running";
  }
  if ((JOB_STATUSES as readonly string[]).includes(status)) return status;
  return status;
}

export function isTerminalJobStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function computeJobDurationMs(
  startedAt: string | Date | null | undefined,
  completedAt: string | Date | null | undefined = new Date(),
): number | null {
  if (!startedAt) return null;
  const start = typeof startedAt === "string" ? Date.parse(startedAt) : startedAt.getTime();
  const end =
    completedAt == null
      ? Date.now()
      : typeof completedAt === "string"
        ? Date.parse(completedAt)
        : completedAt.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

/**
 * Build a DB-safe patch for import_jobs observability columns.
 * Does not mutate existing required fields unless provided.
 */
export function buildImportJobObservabilityUpdate(
  patch: JobObservabilityPatch,
): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (patch.status != null) update.status = patch.status;
  if (patch.stage !== undefined) update.stage = patch.stage;
  if (patch.attempt != null) update.retry_count = patch.attempt;
  if (patch.maxAttempts != null) update.max_attempts = patch.maxAttempts;
  if (patch.startedAt !== undefined) update.started_at = patch.startedAt;
  if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
  if (patch.durationMs !== undefined) update.duration_ms = patch.durationMs;
  if (patch.errorCode !== undefined) update.error_code = patch.errorCode;
  if (patch.errorMessage !== undefined) update.error_message = patch.errorMessage;
  if (patch.metadata !== undefined) update.metadata = patch.metadata;
  update.updated_at = new Date().toISOString();
  return update;
}
