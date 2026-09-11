import { CollectorError, type InstagramCollector } from "@/types/instagram";
import { normalizeInstagramUrl, isDemoUsername } from "@/lib/instagram/url";
import { DEMO_POSTS, DEMO_PROFILE } from "@/lib/demo/store";

export class MockInstagramCollector implements InstagramCollector {
  async scrapeProfile(url: string) {
    const { username } = normalizeInstagramUrl(url);

    if (username.toLowerCase() === "private.demo") {
      throw new CollectorError("This profile is private.", "PRIVATE");
    }
    if (username.toLowerCase() === "missing.demo") {
      throw new CollectorError("Profile not found.", "NOT_FOUND");
    }
    if (username.toLowerCase() === "limited.demo") {
      throw new CollectorError("Temporarily rate limited.", "RATE_LIMITED", true);
    }

    if (!isDemoUsername(username) && username !== "demo") {
      return {
        ...DEMO_PROFILE,
        id: `mock_${username}`,
        username,
        fullName: username,
        biography: "یک کسب‌وکار واقعی روی اینستاگرام. این داده آزمایشی است تا معماری محصول کامل بماند.",
        profileUrl: `https://www.instagram.com/${username}/`,
        isBusinessAccount: true,
        scrapedAt: new Date(),
      };
    }

    return { ...DEMO_PROFILE, scrapedAt: new Date() };
  }

  async scrapePosts(url: string, limit: number) {
    const { username } = normalizeInstagramUrl(url);
    if (username.toLowerCase() === "partial.demo") {
      return DEMO_POSTS.slice(0, 6);
    }
    return DEMO_POSTS.slice(0, Math.max(1, Math.min(limit, DEMO_POSTS.length)));
  }
}
