/**
 * Initial Instagram import size.
 * Override with IMPORT_POSTS_LIMIT in .env.local (1–50).
 */
export const IMPORT_POSTS_LIMIT = Math.max(
  1,
  Math.min(50, Number(process.env.IMPORT_POSTS_LIMIT ?? 12) || 12),
);

/** Jobs stuck in progress longer than this are marked failed (server + UI). */
export const IMPORT_STALE_MS = 2.5 * 60 * 1000;
