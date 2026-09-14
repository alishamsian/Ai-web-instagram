import { describe, expect, it, beforeEach } from "vitest";
import {
  normalizeInstagramImport,
  heuristicAnalysisFromImport,
  normalizeImportMedia,
  InstagramUrlError,
  getInstagramProvider,
  createInstagramProviderFromCollector,
} from "@/lib/instagram";
import { MockInstagramCollector } from "@/lib/instagram/mock";
import { CollectorError } from "@/types/instagram";
import { buildWebsiteConfigFromInstagram } from "@/lib/website/generator";
import {
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
  hasSection,
} from "@/lib/store/registry";
import {
  resetVerticalRegistryForTests,
  CORE_VERTICAL_PACKS,
} from "@/lib/store/verticals";
import {
  resetRecipeRegistryForTests,
  CORE_TEMPLATE_RECIPES,
} from "@/lib/store/recipes";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";

beforeEach(() => {
  resetRegistryForTests(ALL_SECTION_DEFINITIONS);
  resetVerticalRegistryForTests([...CORE_VERTICAL_PACKS]);
  resetRecipeRegistryForTests([...CORE_TEMPLATE_RECIPES]);
  ensureStoreSectionRenderersBound();
});

describe("normalizeInstagramImport", () => {
  it("normalizes a complete raw profile + posts", () => {
    const imported = normalizeInstagramImport({
      workspaceId: "ws_1",
      sourceUrl: "https://www.instagram.com/demo/",
      collector: "test",
      requestedLimit: 6,
      rawProfile: {
        username: "demo",
        full_name: "Demo Brand",
        biography: "Quiet shop",
        profile_pic_url: "https://cdn.example.com/a.jpg",
        followers_count: 100,
        is_private: false,
      },
      rawPosts: [
        {
          id: "p1",
          shortCode: "AAA",
          caption: "Hello #tag",
          displayUrl: "https://cdn.example.com/1.jpg",
        },
        {
          id: "p2",
          shortCode: "BBB",
          type: "video",
          displayUrl: "https://cdn.example.com/2.jpg",
          video_url: "https://cdn.example.com/2.mp4",
        },
      ],
    });

    expect(imported.username).toBe("demo");
    expect(imported.profile.fullName).toBe("Demo Brand");
    expect(imported.posts.length + imported.reels.length).toBe(2);
    expect(imported.media.length).toBeGreaterThan(0);
    expect(imported.workspaceId).toBe("ws_1");
  });

  it("handles incomplete profiles and empty posts", () => {
    const imported = normalizeInstagramImport({
      workspaceId: "ws",
      sourceUrl: "https://instagram.com/empty/",
      collector: "test",
      requestedLimit: 10,
      rawProfile: { username: "empty" },
      rawPosts: [],
    });
    expect(imported.profile.biography).toBeNull();
    expect(imported.posts).toHaveLength(0);
    expect(imported.scrapeStatus).toBe("PARTIAL");
  });

  it("dedupes posts and drops invalid media URLs", () => {
    const imported = normalizeInstagramImport({
      workspaceId: "ws",
      sourceUrl: "https://instagram.com/x/",
      collector: "test",
      requestedLimit: 5,
      rawProfile: {
        username: "x",
        profile_pic_url: "javascript:alert(1)",
      },
      rawPosts: [
        {
          id: "1",
          shortCode: "dup",
          displayUrl: "https://cdn.example.com/ok.jpg",
        },
        {
          id: "2",
          shortCode: "dup",
          displayUrl: "https://cdn.example.com/ok.jpg",
        },
        {
          id: "3",
          shortCode: "bad",
          displayUrl: "not-a-url",
        },
      ],
    });
    expect(imported.posts).toHaveLength(2);
    expect(
      imported.media.every((m) => m.originalUrl.startsWith("http")),
    ).toBe(true);
    expect(
      imported.media.some((m) => m.originalUrl.includes("javascript")),
    ).toBe(false);
  });
});

describe("normalizeImportMedia", () => {
  it("builds stable ids and alt fallbacks", () => {
    const media = normalizeImportMedia({
      profile: {
        id: "u1",
        username: "brand",
        fullName: "Brand Co",
        biography: null,
        profileUrl: "https://instagram.com/brand/",
        profilePicUrl: "https://cdn.example.com/avatar.jpg",
        profilePicUrlHD: null,
        followersCount: null,
        followsCount: null,
        postsCount: null,
        isBusinessAccount: false,
        isPrivate: false,
        isVerified: false,
        businessCategory: null,
        externalUrl: null,
        scrapedAt: new Date(),
      },
      posts: [
        {
          id: "p1",
          shortcode: "sc",
          url: "https://instagram.com/p/sc/",
          type: "image",
          caption: "Caption text",
          hashtags: [],
          mentions: [],
          likesCount: null,
          commentsCount: null,
          viewsCount: null,
          timestamp: new Date().toISOString(),
          displayUrl: "https://cdn.example.com/p1.jpg",
          videoUrl: null,
          images: ["https://cdn.example.com/p1.jpg", "https://cdn.example.com/p1.jpg"],
          alt: null,
          ownerUsername: "brand",
          ownerId: "u1",
        },
      ],
    });
    expect(media[0]?.id).toContain("profile");
    expect(media.some((m) => m.alt === "Brand Co")).toBe(true);
    expect(media.filter((m) => m.originalUrl.includes("p1.jpg"))).toHaveLength(1);
  });
});

describe("buildWebsiteConfigFromInstagram", () => {
  it("builds WebsiteConfig without AI analysis", () => {
    const imported = normalizeInstagramImport({
      workspaceId: "ws",
      sourceUrl: "https://instagram.com/studio/",
      collector: "test",
      requestedLimit: 4,
      rawProfile: {
        username: "studio",
        full_name: "Studio",
        biography: "Creative work",
        external_url: "https://example.com",
        profile_pic_url: "https://cdn.example.com/logo.jpg",
      },
      rawPosts: [
        {
          id: "a",
          shortCode: "A1",
          displayUrl: "https://cdn.example.com/g1.jpg",
          caption: "Shot one",
        },
      ],
    });

    const config = buildWebsiteConfigFromInstagram({
      imported,
      locale: "en",
    });

    expect(config.brand.name).toBe("Studio");
    expect(config.seo.title.length).toBeGreaterThan(0);
    expect(config.seo.description).toMatch(/Creative|Studio/);
    expect(Object.keys(config.media).length).toBeGreaterThan(0);
    expect(config.sections.every((s) => hasSection(s.type))).toBe(true);
    expect(config.sections.some((s) => s.type === "footer")).toBe(true);
    expect(config.content.products?.items ?? []).toHaveLength(0);
  });

  it("is deterministic for the same import", () => {
    const imported = normalizeInstagramImport({
      workspaceId: "ws",
      sourceUrl: "https://instagram.com/same/",
      collector: "test",
      requestedLimit: 3,
      rawProfile: { username: "same", full_name: "Same" },
      rawPosts: [],
    });
    const a = buildWebsiteConfigFromInstagram({ imported, locale: "fa" });
    const b = buildWebsiteConfigFromInstagram({ imported, locale: "fa" });
    expect(a.brand.name).toBe(b.brand.name);
    expect(a.template).toBe(b.template);
    expect(a.sections.map((s) => s.type)).toEqual(b.sections.map((s) => s.type));
  });

  it("heuristic analysis never invents products", () => {
    const imported = normalizeInstagramImport({
      workspaceId: "ws",
      sourceUrl: "https://instagram.com/x/",
      collector: "test",
      requestedLimit: 2,
      rawProfile: { username: "x", biography: "Buy now amazing product deal" },
      rawPosts: [
        {
          id: "1",
          shortCode: "z",
          caption: "Our best jacket ever on sale",
          displayUrl: "https://cdn.example.com/j.jpg",
        },
      ],
    });
    const analysis = heuristicAnalysisFromImport(imported, "en");
    expect(analysis.products).toHaveLength(0);
    const config = buildWebsiteConfigFromInstagram({
      imported,
      analysis,
      locale: "en",
    });
    expect(config.content.products?.items ?? []).toHaveLength(0);
  });
});

describe("InstagramProvider", () => {
  it("imports demo profile via mock provider", async () => {
    const provider = getInstagramProvider("demo");
    const result = await provider.importProfile({
      usernameOrUrl: "demo",
      postsLimit: 4,
    });
    expect(result.username).toBeTruthy();
    expect(result.profile.username).toBeTruthy();
    expect(result.posts.length).toBeGreaterThan(0);
  });

  it("maps private demo failure", async () => {
    const provider = createInstagramProviderFromCollector(
      new MockInstagramCollector(),
      "mock",
    );
    await expect(
      provider.importProfile({ usernameOrUrl: "private.demo" }),
    ).rejects.toBeInstanceOf(CollectorError);
  });

  it("rejects invalid username/url", async () => {
    const provider = getInstagramProvider("demo");
    await expect(
      provider.importProfile({ usernameOrUrl: "" }),
    ).rejects.toBeInstanceOf(InstagramUrlError);
  });
});
