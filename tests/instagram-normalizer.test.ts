import { describe, expect, it } from "vitest";
import { normalizePost, normalizeProfile } from "@/lib/instagram/normalizer";
import { mergeInstagramData } from "@/lib/instagram/merger";

describe("Instagram normalization", () => {
  it("normalizes profiles away from provider field names", () => {
    const profile = normalizeProfile({
      username: "demo",
      full_name: "نوران",
      biography: "bio",
      followers_count: 12,
      is_private: false,
      is_business_account: true,
    });
    expect(profile.fullName).toBe("نوران");
    expect(profile.followersCount).toBe(12);
    expect(profile.isBusinessAccount).toBe(true);
  });

  it("keeps carousel children", () => {
    const post = normalizePost(
      {
        id: "1",
        shortCode: "abc",
        type: "sidecar",
        caption: "hello #tag @user",
        displayUrl: "https://img/1.jpg",
        childPosts: [
          { id: "1a", displayUrl: "https://img/1.jpg" },
          { id: "1b", displayUrl: "https://img/2.jpg" },
        ],
      },
      { username: "demo", id: "owner" },
    );
    expect(post.type).toBe("carousel");
    expect(post.childPosts).toHaveLength(2);
    expect(post.hashtags).toContain("tag");
  });

  it("detects reels and partial imports", () => {
    const reel = normalizePost(
      { id: "r1", type: "reel", displayUrl: "https://img/r.jpg" },
      { username: "demo", id: "owner" },
    );
    const merged = mergeInstagramData({
      workspaceId: "ws",
      sourceUrl: "https://instagram.com/demo/",
      profile: normalizeProfile({ username: "demo", id: "demo" }),
      posts: [reel],
      requestedLimit: 3,
      collector: "mock",
    });
    expect(merged.reels).toHaveLength(1);
    expect(merged.scrapeStatus).toBe("PARTIAL");
  });
});
