import { planLimits, type PlanId } from "@/lib/config/plans";

/** Absolute product ceiling — never scrape more than this. */
export const IMPORT_POSTS_ABSOLUTE_MAX = 50;

/**
 * Server-enforced ceiling for any import (still plan-capped at call sites).
 * Set IMPORT_POSTS_LIMIT in env only to lower cost/ops caps (1–50).
 * This value is NOT available on the client — pass maxPosts from the server.
 */
export const IMPORT_POSTS_HARD_MAX = Math.max(
  1,
  Math.min(
    IMPORT_POSTS_ABSOLUTE_MAX,
    Number(process.env.IMPORT_POSTS_LIMIT ?? IMPORT_POSTS_ABSOLUTE_MAX) ||
      IMPORT_POSTS_ABSOLUTE_MAX,
  ),
);

/** Default suggestion when the user hasn't chosen yet. */
export const IMPORT_POSTS_DEFAULT = 6;

/**
 * How long a job can sit without an `updatedAt` heartbeat before UI/API
 * treat it as stalled. Larger scrapes keep heartbeats; this is the safety net.
 */
export const IMPORT_STALE_MS = 10 * 60 * 1000;

/** Jobs stuck in progress longer than this are marked failed (server + UI). */
export const IMPORT_STALE_MS_LEGACY = IMPORT_STALE_MS;

/** Preset choices shown in the UI, filtered by plan max. */
export function importPostChoices(maxPosts: number): number[] {
  const presets = [4, 6, 8, 10, 12, 20, 30, 50];
  const filtered = presets.filter((n) => n <= maxPosts);
  if (!filtered.includes(maxPosts) && maxPosts >= 1) {
    filtered.push(maxPosts);
    filtered.sort((a, b) => a - b);
  }
  return filtered.length ? filtered : [Math.max(1, maxPosts)];
}

/** Clamp a user-requested post count to the plan (+ hard) ceiling. */
export function clampImportPosts(
  requested: number | string | null | undefined,
  plan?: PlanId | string,
) {
  const max = Math.min(
    planLimits(plan).maxImportPosts,
    IMPORT_POSTS_HARD_MAX,
  );
  const raw = Number(requested);
  if (!Number.isFinite(raw) || raw < 1) {
    return Math.min(IMPORT_POSTS_DEFAULT, max);
  }
  return Math.max(1, Math.min(max, Math.floor(raw)));
}

/** Apify sync timeout for post scrapes — scales with requested volume. */
export function apifyPostsTimeoutMs(limit: number) {
  const n = Math.max(1, limit);
  // Base 90s + ~10s/post, capped under serverless maxDuration headroom.
  return Math.min(240_000, Math.max(90_000, 90_000 + n * 10_000));
}

function resolvedPostsLimit(postsLimit?: number | null) {
  return typeof postsLimit === "number" && postsLimit > 0
    ? postsLimit
    : IMPORT_POSTS_DEFAULT;
}

/** Client polling budget so the UI doesn't give up during large imports. */
export function importClientTimeoutMs(postsLimit?: number | null) {
  const n = resolvedPostsLimit(postsLimit);
  return Math.min(12 * 60_000, Math.max(8 * 60_000, 5 * 60_000 + n * 20_000));
}

/** Stale threshold; slightly looser when more posts were requested. */
export function importStaleMs(postsLimit?: number | null) {
  const n = resolvedPostsLimit(postsLimit);
  return Math.min(12 * 60_000, Math.max(IMPORT_STALE_MS, 6 * 60_000 + n * 12_000));
}

/**
 * User-facing estimate (whole minutes) shown on the build timer.
 * Scales with post count so the UI matches expected wait time.
 */
export function importTypicalMinutes(postsLimit?: number | null) {
  const n = resolvedPostsLimit(postsLimit);
  // After parallel scrape/media: ~60s base + ~12s/post → minutes, clamped 2–10
  return Math.min(10, Math.max(2, Math.ceil((60 + n * 12) / 60)));
}
