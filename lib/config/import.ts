/**
 * Initial Instagram import size.
 * Override with IMPORT_POSTS_LIMIT in .env.local (1–50).
 */
export const IMPORT_POSTS_LIMIT = Math.max(
  1,
  Math.min(50, Number(process.env.IMPORT_POSTS_LIMIT ?? 12) || 12),
);
