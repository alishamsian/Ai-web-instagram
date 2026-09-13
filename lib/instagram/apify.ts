import {
  CollectorError,
  type InstagramCollector,
  type InstagramPost,
  type InstagramProfile,
} from "@/types/instagram";
import { normalizeInstagramUrl } from "@/lib/instagram/url";
import { normalizePost, normalizeProfile } from "@/lib/instagram/normalizer";
import { apifyPostsTimeoutMs } from "@/lib/config/import";

const APIFY_BASE = "https://api.apify.com/v2";
/** Soft limit for sync profile actor runs. */
const APIFY_PROFILE_TIMEOUT_MS = 90_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runActor<T>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = APIFY_PROFILE_TIMEOUT_MS,
) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new CollectorError("Apify is not configured.", "SCRAPE_FAILED", true);
  }

  const encodedActor = actorId.replace("/", "~");
  const timeoutSec = Math.ceil(timeoutMs / 1000);
  const url = `${APIFY_BASE}/acts/${encodedActor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutSec}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
      timeoutMs + 5_000,
    );
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new CollectorError(
        "Instagram import timed out. Try fewer posts, or use the demo profile.",
        "RATE_LIMITED",
        true,
      );
    }
    throw new CollectorError(
      "Something went wrong while importing this profile.",
      "SCRAPE_FAILED",
      true,
    );
  }

  if (response.status === 429 || response.status === 408) {
    throw new CollectorError(
      "Instagram data is temporarily unavailable.",
      "RATE_LIMITED",
      true,
    );
  }

  if (!response.ok) {
    throw new CollectorError(
      "Something went wrong while importing this profile.",
      "SCRAPE_FAILED",
      true,
    );
  }

  return (await response.json()) as T[];
}

function isErrorItem(item: Record<string, unknown>) {
  return Boolean(item.error || item.errorDescription);
}

export class ApifyCollector implements InstagramCollector {
  async scrapeProfile(url: string): Promise<InstagramProfile> {
    const { profileUrl, username } = normalizeInstagramUrl(url);
    const actor =
      process.env.APIFY_PROFILE_ACTOR ?? "apify/instagram-profile-scraper";

    const items = await runActor<Record<string, unknown>>(actor, {
      usernames: [username],
      directUrls: [profileUrl],
    });

    const raw = items.find((item) => !isErrorItem(item)) ?? items[0];
    if (!raw || isErrorItem(raw)) {
      throw new CollectorError(
        "We couldn't find this Instagram profile.",
        "NOT_FOUND",
      );
    }

    const profile = normalizeProfile(raw, profileUrl);
    if (profile.isPrivate) {
      throw new CollectorError(
        "This profile is private. Connect an account you own or use a public profile.",
        "PRIVATE",
      );
    }
    return profile;
  }

  async scrapePosts(url: string, limit: number): Promise<InstagramPost[]> {
    const { profileUrl, username } = normalizeInstagramUrl(url);
    const actor = process.env.APIFY_POST_ACTOR ?? "apify/instagram-scraper";
    const timeoutMs = apifyPostsTimeoutMs(limit);

    const items = await runActor<Record<string, unknown>>(
      actor,
      {
        directUrls: [profileUrl],
        resultsType: "posts",
        resultsLimit: limit,
        resultsLimitPerProfile: limit,
      },
      timeoutMs,
    );

    const posts = items
      .filter((item) => !isErrorItem(item))
      .map((item) =>
        normalizePost(item, {
          username,
          id: String(item.ownerId ?? username),
        }),
      )
      .filter((post) => Boolean(post.id));

    // Profile found but posts unavailable — continue with empty feed rather than hanging.
    if (!posts.length) {
      return [];
    }

    return posts.slice(0, limit);
  }
}
