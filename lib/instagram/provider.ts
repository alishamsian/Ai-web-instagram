import type {
  InstagramCollector,
  InstagramPost,
  InstagramProfile,
} from "@/types/instagram";
import { CollectorError } from "@/types/instagram";
import { getInstagramCollector } from "@/lib/instagram/collector";
import {
  InstagramUrlError,
  normalizeInstagramUrl,
} from "@/lib/instagram/url";

/**
 * Stable provider boundary for product code.
 * Implementations may wrap Apify, mock, or a future approved API.
 */
export interface InstagramProvider {
  /** Human-readable provider id (e.g. "mock", "apify"). */
  readonly id: string;
  importProfile(input: {
    usernameOrUrl: string;
    postsLimit?: number;
  }): Promise<{
    profile: InstagramProfile;
    posts: InstagramPost[];
    sourceUrl: string;
    username: string;
  }>;
}

class CollectorInstagramProvider implements InstagramProvider {
  readonly id: string;

  constructor(
    private readonly collector: InstagramCollector,
    id: string,
  ) {
    this.id = id;
  }

  async importProfile(input: {
    usernameOrUrl: string;
    postsLimit?: number;
  }) {
    let parsed: { profileUrl: string; username: string };
    try {
      parsed = normalizeInstagramUrl(input.usernameOrUrl);
    } catch (error) {
      if (error instanceof InstagramUrlError) throw error;
      throw new InstagramUrlError("Invalid Instagram URL", "INVALID_URL");
    }

    const limit = Math.min(Math.max(input.postsLimit ?? 12, 1), 50);
    try {
      const [profile, posts] = await Promise.all([
        this.collector.scrapeProfile(parsed.profileUrl),
        this.collector.scrapePosts(parsed.profileUrl, limit),
      ]);
      if (profile.isPrivate) {
        throw new CollectorError("This profile is private.", "PRIVATE");
      }
      return {
        profile,
        posts,
        sourceUrl: parsed.profileUrl,
        username: profile.username || parsed.username,
      };
    } catch (error) {
      if (error instanceof CollectorError || error instanceof InstagramUrlError) {
        throw error;
      }
      throw new CollectorError(
        error instanceof Error ? error.message : "Import failed",
        "SCRAPE_FAILED",
        true,
      );
    }
  }
}

/** Resolve the active Instagram provider (mock / Apify / future). */
export function getInstagramProvider(username?: string): InstagramProvider {
  const collector = getInstagramCollector(username);
  const id =
    collector.constructor?.name === "ApifyCollector" ? "apify" : "mock";
  return new CollectorInstagramProvider(collector, id);
}

export function createInstagramProviderFromCollector(
  collector: InstagramCollector,
  id = "custom",
): InstagramProvider {
  return new CollectorInstagramProvider(collector, id);
}
