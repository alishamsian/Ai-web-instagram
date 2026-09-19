/**
 * Visual Editor Phase 1 — adapter, seed, lossless persistence tests.
 */

import { describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  assertAdapterPreservesConfig,
  buildModernAgencyProject,
  isVisualProjectEmpty,
  MODERN_AGENCY_PAGE_IDS,
  VISUAL_BLOCKS,
  VISUAL_SECTIONS,
  websiteConfigToVisualProject,
} from "@/lib/visual-editor";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "نور",
      colors: {
        primary: "#111111",
        secondary: "#FFFFFF",
        accent: "#888888",
        background: "#FFFFFF",
        foreground: "#111111",
        muted: "#F5F5F5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "عنوان",
        subheadline: "توضیح",
        cta: "خرید",
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "SEO", description: "Desc", keywords: ["a"] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
    },
    media: {
      "img-1": { url: "https://example.com/a.jpg", alt: "a", type: "image" },
    },
  };
}

describe("visual editor seed", () => {
  it("builds a multi-page Modern Agency project", () => {
    const project = buildModernAgencyProject(baseConfig());
    expect(Array.isArray(project.pages)).toBe(true);
    expect(project.pages).toHaveLength(MODERN_AGENCY_PAGE_IDS.length);
    const ids = (project.pages as { id: string }[]).map((p) => p.id);
    expect(ids).toEqual([...MODERN_AGENCY_PAGE_IDS]);
  });

  it("detects empty projects", () => {
    expect(isVisualProjectEmpty(null)).toBe(true);
    expect(isVisualProjectEmpty({})).toBe(true);
    expect(isVisualProjectEmpty({ pages: [] })).toBe(true);
    expect(isVisualProjectEmpty(buildModernAgencyProject())).toBe(false);
  });
});

describe("visual editor blocks foundation", () => {
  it("exposes required foundation blocks", () => {
    const ids = VISUAL_BLOCKS.map((b) => b.id);
    for (const id of [
      "container",
      "section",
      "columns",
      "grid",
      "heading",
      "text",
      "button",
      "image",
      "video",
      "spacer",
      "divider",
      "card",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("exposes foundation sections", () => {
    const ids = VISUAL_SECTIONS.map((b) => b.id);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    expect(ids.some((id) => id.includes("hero"))).toBe(true);
    expect(ids.some((id) => id.includes("footer"))).toBe(true);
  });
});

describe("WebsiteConfig adapter", () => {
  it("seeds from config when visualEditor is missing", () => {
    const config = baseConfig();
    const project = websiteConfigToVisualProject(config);
    expect(isVisualProjectEmpty(project as never)).toBe(false);
  });

  it("prefers existing visualEditor.project", () => {
    const config = baseConfig();
    config.visualEditor = {
      engine: "grapesjs",
      version: 1,
      project: {
        pages: [{ id: "custom", name: "Custom", component: "<body>Hi</body>" }],
      },
      activePageId: "custom",
    };
    const project = websiteConfigToVisualProject(config);
    expect((project.pages as { id: string }[])[0]?.id).toBe("custom");
  });

  it("preserves WebsiteConfig fields when applying project", () => {
    const original = baseConfig();
    (original as WebsiteConfig & { customField?: string }).customField =
      "keep-me";
    const project = buildModernAgencyProject(original);
    const restored = applyVisualProjectToWebsiteConfig(original, project, {
      activePageId: "about",
    });
    const check = assertAdapterPreservesConfig(original, restored);
    expect(check.ok).toBe(true);
    expect(restored.visualEditor?.engine).toBe("grapesjs");
    expect(restored.visualEditor?.activePageId).toBe("about");
    expect(restored.content.hero.headline).toBe("عنوان");
    expect(restored.sections).toHaveLength(2);
    expect(restored.media["img-1"]?.url).toBe("https://example.com/a.jpg");
    expect(
      (restored as WebsiteConfig & { customField?: string }).customField,
    ).toBe("keep-me");
  });

  it("serializes project onto visualEditor without wiping seo", () => {
    const original = baseConfig();
    const next = applyVisualProjectToWebsiteConfig(
      original,
      { pages: [{ id: "home", name: "Home" }], styles: [], assets: [] },
    );
    expect(next.seo.title).toBe("SEO");
    expect(next.visualEditor?.project.pages).toBeTruthy();
  });
});
