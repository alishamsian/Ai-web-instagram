/**
 * Optimistic concurrency for website PATCH.
 * Pure helpers — safe to unit-test without hitting the API.
 */

export function hasOptimisticVersionConflict(
  expectedVersion: number | undefined,
  currentVersion: number,
): boolean {
  return typeof expectedVersion === "number" && expectedVersion !== currentVersion;
}

/** Fields that config PATCH must never silently overwrite. */
export type WebsitePersistenceMeta = {
  status: string;
  publishedAt: string | null | undefined;
  version: number;
};

/**
 * Apply a config save onto persistence metadata.
 * Config payload must not reset publish status / publishedAt.
 */
export function nextPersistenceAfterConfigSave(
  meta: WebsitePersistenceMeta,
): WebsitePersistenceMeta {
  return {
    status: meta.status,
    publishedAt: meta.publishedAt,
    version: meta.version + 1,
  };
}
