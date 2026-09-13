import { describe, expect, it, beforeEach } from "vitest";
import { generateWebsiteConfig } from "@/lib/website/generator";
import { DEMO_POSTS, DEMO_PROFILE } from "@/lib/demo/store";
import { demoAnalysis } from "@/lib/ai/mock";
import { mergeInstagramData } from "@/lib/instagram/merger";
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

describe("Website generator (P5 pipeline)", () => {
  const imported = mergeInstagramData({
    workspaceId: "ws",
    sourceUrl: DEMO_PROFILE.profileUrl,
    profile: DEMO_PROFILE,
    posts: DEMO_POSTS,
    requestedLimit: 3,
    collector: "mock",
  });

  it("produces a store WebsiteConfig with recipe + registered sections", () => {
    const config = generateWebsiteConfig({
      imported,
      analysis: demoAnalysis,
      locale: "fa",
    });
    expect(config.template).toBe("store");
    expect(config.settings.direction).toBe("rtl");
    expect(config.settings.recipeId).toBeTruthy();
    expect(config.sections.every((s) => hasSection(s.type))).toBe(true);
    expect(config.sections.some((s) => s.type === "hero")).toBe(true);
    expect(config.sections.some((s) => s.type === "footer")).toBe(true);
  });

  it("uses imported / analysis media in the renderer config", () => {
    const config = generateWebsiteConfig({
      imported,
      analysis: demoAnalysis,
      locale: "en",
    });
    expect(Object.keys(config.media).length).toBeGreaterThan(0);
    expect(config.brand.name).toBeTruthy();
  });

  it("does not invent products when analysis has none and captions lack names", () => {
    const config = generateWebsiteConfig({
      imported: {
        ...imported,
        posts: imported.posts.map((p) => ({ ...p, caption: null })),
        reels: [],
      },
      analysis: { ...demoAnalysis, products: [] },
      locale: "fa",
    });
    expect(config.content.products?.items ?? []).toHaveLength(0);
    expect(JSON.stringify(config)).not.toMatch(/قطعه 0|Piece 0|Product 0/);
  });
});
