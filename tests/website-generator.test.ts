import { describe, expect, it } from "vitest";
import { generateWebsiteConfig } from "@/lib/website/generator";
import { templates } from "@/lib/website/templates";
import { DEMO_POSTS, DEMO_PROFILE } from "@/lib/demo/store";
import { demoAnalysis } from "@/lib/ai/mock";
import { mergeInstagramData } from "@/lib/instagram/merger";

describe("Website generator", () => {
  const imported = mergeInstagramData({
    workspaceId: "ws",
    sourceUrl: DEMO_PROFILE.profileUrl,
    profile: DEMO_PROFILE,
    posts: DEMO_POSTS,
    requestedLimit: 3,
    collector: "mock",
  });

  it("selects the store template and keeps section order", () => {
    const config = generateWebsiteConfig({
      imported,
      analysis: demoAnalysis,
      locale: "fa",
    });
    expect(config.template).toBe("store");
    expect(config.sections.map((section) => section.type)).toEqual(
      templates.store.sections,
    );
    expect(config.settings.direction).toBe("rtl");
  });

  it("uses imported images in the renderer config", () => {
    const config = generateWebsiteConfig({
      imported,
      analysis: demoAnalysis,
      locale: "en",
    });
    expect(Object.keys(config.media).length).toBeGreaterThan(5);
    expect(config.content.hero.headline).toBe(demoAnalysis.heroCopy.headline);
  });

  it("always includes a products section with items", () => {
    const config = generateWebsiteConfig({
      imported,
      analysis: { ...demoAnalysis, products: [] },
      locale: "fa",
    });
    expect(config.sections.some((section) => section.type === "products")).toBe(
      true,
    );
    expect(config.content.products?.items.length).toBeGreaterThan(0);
  });
});
