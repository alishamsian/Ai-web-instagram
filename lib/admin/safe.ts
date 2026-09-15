import "server-only";

/**
 * Structured admin observability for isolated failures.
 * Never echo raw messages to the UI — log here, return safe reasons upstream.
 */
export function logAdminFailure(
  scope: string,
  error: unknown,
  meta?: Record<string, string | number | boolean | null | undefined>,
): void {
  const message =
    error instanceof Error
      ? error.message.slice(0, 300)
      : typeof error === "string"
        ? error.slice(0, 300)
        : "unknown";
  // Avoid dumping stacks / secrets into logs via meta.
  const safeMeta = meta
    ? Object.fromEntries(
        Object.entries(meta).map(([k, v]) => [k, v == null ? null : String(v).slice(0, 120)]),
      )
    : undefined;
  console.error(`[admin:${scope}]`, message, safeMeta ?? "");
}

export type AdminListResult<T> = {
  rows: T[];
  /** Non-null when the list cannot be trusted (query error / missing table). */
  unavailableReason: string | null;
};

export function listOk<T>(rows: T[]): AdminListResult<T> {
  return { rows, unavailableReason: null };
}

export function listUnavailable<T>(reason: string): AdminListResult<T> {
  return { rows: [], unavailableReason: reason };
}

/** Isolate independent dashboard/section fetches without failing the whole page. */
export async function settledValue<T>(
  scope: string,
  promise: Promise<T>,
  fallback: T,
): Promise<{ value: T; failed: boolean }> {
  try {
    const value = await promise;
    return { value, failed: false };
  } catch (error) {
    logAdminFailure(scope, error);
    return { value: fallback, failed: true };
  }
}
