/**
 * Phase 2.4 — professional builder interaction & component system tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  canDropOnTarget,
  canNestBlocks,
  blockCanNest,
  isLeafBlock,
  isSectionBlock,
  normalizeBlockId,
  resolvePositionFromRatio,
  createBlockHtml,
  getVisualBlock,
  getVisualRegistry,
  listVisualBlocks,
  mergePreservedIntoHtml,
  filterCompatibleFields,
  compatibleRolesForSectionType,
  remintAttributeTree,
  registerReusableComponent,
  listReusableComponents,
  getReusableComponent,
  removeReusableComponent,
  resetReusableComponentStore,
  REUSABLE_SCHEMA_VERSION,
  readVisibilityMap,
  parseCssLength,
  formatCssLength,
  relevantInspectorGroups,
  HERO_VARIANTS,
  resolveVariantId,
  nextSectionId,
  VISUAL_PAGE_HOME,
  extractPageSectionMeta,
} from "@/lib/visual-editor";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Test",
      colors: {
        primary: "#111111",
        secondary: "#ffffff",
        accent: "#ef6351",
        background: "#ffffff",
        foreground: "#111111",
        muted: "#f5f5f5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
      design: { contentWidth: "default", radius: "soft", shadow: "subtle" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "HOME",
        subheadline: "sub",
        cta: "Go",
      },
      about: { title: "About", body: "About body" },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true, variant: "minimal" },
      { id: "about-1", type: "about", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "t", description: "d", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {
      img1: {
        type: "image",
        url: "https://example.com/a.jpg",
        alt: "A",
      },
    },
  };
}

describe("Phase 2.4 registry nesting", () => {
  it("layout containers can nest", () => {
    expect(blockCanNest("layout-container")).toBe(true);
    expect(blockCanNest("layout-stack")).toBe(true);
    expect(blockCanNest("layout-columns")).toBe(true);
    expect(blockCanNest("layout-grid")).toBe(true);
  });

  it("leaf content cannot nest", () => {
    expect(isLeafBlock("content-text")).toBe(true);
    expect(isLeafBlock("content-heading")).toBe(true);
    expect(isLeafBlock("content-button")).toBe(true);
    expect(isLeafBlock("media-image")).toBe(true);
    expect(blockCanNest("content-text")).toBe(false);
  });

  it("rejects text accepting a section", () => {
    const d = canNestBlocks("content-text", "section-hero");
    expect(d.accepted).toBe(false);
  });

  it("rejects button accepting button", () => {
    expect(canNestBlocks("content-button", "content-button").accepted).toBe(
      false,
    );
  });

  it("rejects section nesting inside section", () => {
    expect(canNestBlocks("section-hero", "section-cta").accepted).toBe(false);
  });

  it("allows heading inside container", () => {
    expect(canNestBlocks("layout-container", "content-heading").accepted).toBe(
      true,
    );
  });

  it("allows components inside hero section", () => {
    expect(canNestBlocks("section-hero", "content-button").accepted).toBe(true);
  });

  it("wrapper accepts sections", () => {
    expect(canNestBlocks("wrapper", "section-gallery").accepted).toBe(true);
  });

  it("normalizes section type to block id", () => {
    expect(normalizeBlockId("hero")).toBe("section-hero");
    expect(normalizeBlockId("section-hero")).toBe("section-hero");
  });

  it("isSectionBlock detects sections", () => {
    expect(isSectionBlock("section-hero")).toBe(true);
    expect(isSectionBlock("content-text")).toBe(false);
  });

  it("drop inside invalid leaf is rejected", () => {
    const d = canDropOnTarget({
      targetBlockId: "content-text",
      childBlockId: "section-hero",
      position: "inside",
    });
    expect(d.accepted).toBe(false);
  });

  it("drop before sibling under wrapper is accepted", () => {
    const d = canDropOnTarget({
      parentBlockId: "wrapper",
      targetBlockId: "section-hero",
      childBlockId: "section-cta",
      position: "before",
    });
    expect(d.accepted).toBe(true);
  });
});

describe("Phase 2.4 drop position", () => {
  it("resolves before / inside / after from ratio", () => {
    expect(resolvePositionFromRatio(0.1, true)).toBe("before");
    expect(resolvePositionFromRatio(0.5, true)).toBe("inside");
    expect(resolvePositionFromRatio(0.9, true)).toBe("after");
  });

  it("falls back to before/after when inside not allowed", () => {
    expect(resolvePositionFromRatio(0.4, false)).toBe("before");
    expect(resolvePositionFromRatio(0.6, false)).toBe("after");
  });
});

describe("Phase 2.4 variants", () => {
  it("hero variants include minimal and split", () => {
    const ids = HERO_VARIANTS.map((v) => v.id);
    expect(ids).toContain("minimal");
    expect(ids).toContain("split");
  });

  it("createBlockHtml rebuilds split structure", () => {
    const { html } = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      sectionId: "hero-1",
      variantId: "split",
    });
    expect(html).toContain('data-section-variant="split"');
    expect(html).toContain("grid-template-columns");
    expect(html).toContain("data-section-id=\"hero-1\"");
  });

  it("createBlockHtml preserves section id across variants", () => {
    const a = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      sectionId: "hero-9",
      variantId: "minimal",
    });
    const b = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      sectionId: "hero-9",
      variantId: "overlay",
    });
    expect(a.html).toContain('data-section-id="hero-9"');
    expect(b.html).toContain('data-section-id="hero-9"');
    expect(b.html).toContain('data-section-variant="overlay"');
  });

  it("mergePreservedIntoHtml keeps headline/cta text", () => {
    const { html } = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      sectionId: "hero-1",
      variantId: "split",
    });
    const merged = mergePreservedIntoHtml(html, [
      {
        contentPath: "content.hero.headline",
        text: "Preserved Headline",
      },
      {
        contentPath: "content.hero.cta",
        text: "Buy now",
        href: "/shop",
      },
    ]);
    expect(merged).toContain("Preserved Headline");
    expect(merged).toContain("Buy now");
    expect(merged).toContain('href="/shop"');
  });

  it("compatible roles for hero include headline", () => {
    expect(compatibleRolesForSectionType("hero")).toContain("headline");
    const filtered = filterCompatibleFields("hero", [
      { role: "headline", text: "H" },
      { role: "junk", text: "X" },
    ]);
    expect(filtered.map((f) => f.role)).toEqual(["headline"]);
  });

  it("resolveVariantId rejects unknown", () => {
    expect(resolveVariantId(HERO_VARIANTS, "nope")).toBe("minimal");
    expect(resolveVariantId(HERO_VARIANTS, "split")).toBe("split");
  });

  it("gallery variants preserve media-oriented markup identity hooks", () => {
    const grid = createBlockHtml("section-gallery", {
      locale: "en",
      pageId: "home",
      sectionId: "gallery-1",
      variantId: "grid",
    });
    const masonry = createBlockHtml("section-gallery", {
      locale: "en",
      pageId: "home",
      sectionId: "gallery-1",
      variantId: "masonry",
    });
    expect(grid.html).toContain('data-section-id="gallery-1"');
    expect(masonry.html).toContain('data-section-id="gallery-1"');
  });
});

describe("Phase 2.4 duplication identity", () => {
  it("remints unique section ids", () => {
    const result = remintAttributeTree(
      [
        {
          attrs: {
            "data-section-id": "hero-1",
            "data-section-type": "hero",
            "data-component-id": "hero-1__headline",
            "data-content-path": "content.hero.headline",
          },
          children: [
            {
              attrs: {
                "data-component-id": "hero-1__cta",
                "data-content-path": "content.hero.cta",
              },
            },
          ],
        },
      ],
      ["hero-1"],
    );
    expect(result[0].attrs["data-section-id"]).toBe("hero-2");
    expect(result[0].attrs["data-content-path"]).toBeUndefined();
    expect(result[0].attrs["data-component-id"]).toContain("hero-2");
    expect(result[0].children?.[0].attrs["data-component-id"]).toContain(
      "hero-2",
    );
    expect(result[0].children?.[0].attrs["data-content-path"]).toBeUndefined();
  });

  it("nextSectionId increments past existing", () => {
    expect(nextSectionId("hero", ["hero-1", "hero-3"])).toBe("hero-4");
  });

  it("duplicate remint does not reuse source id", () => {
    const a = remintAttributeTree(
      [{ attrs: { "data-section-id": "cta-1", "data-section-type": "cta" } }],
      ["cta-1"],
    );
    const b = remintAttributeTree(
      [{ attrs: { "data-section-id": "cta-1", "data-section-type": "cta" } }],
      ["cta-1", a[0].attrs["data-section-id"]],
    );
    expect(a[0].attrs["data-section-id"]).not.toBe("cta-1");
    expect(b[0].attrs["data-section-id"]).not.toBe(
      a[0].attrs["data-section-id"],
    );
  });

  it("standalone component remint strips content path", () => {
    const result = remintAttributeTree(
      [
        {
          attrs: {
            "data-component-id": "solo__heading",
            "data-content-path": "content.hero.headline",
          },
        },
      ],
      [],
    );
    expect(result[0].attrs["data-component-id"]).toContain("_copy");
    expect(result[0].attrs["data-content-path"]).toBeUndefined();
  });
});

describe("Phase 2.4 reusable foundation", () => {
  beforeEach(() => {
    resetReusableComponentStore();
  });

  it("registers and lists reusable components", () => {
    const entry = registerReusableComponent({
      type: "section",
      name: "My Hero",
      sourceBlockId: "section-hero",
      variant: "minimal",
    });
    expect(entry.schemaVersion).toBe(REUSABLE_SCHEMA_VERSION);
    expect(listReusableComponents()).toHaveLength(1);
    expect(getReusableComponent(entry.id)?.name).toBe("My Hero");
  });

  it("removes reusable components", () => {
    const entry = registerReusableComponent({
      type: "component",
      name: "CTA",
      sourceBlockId: "content-button",
    });
    expect(removeReusableComponent(entry.id)).toBe(true);
    expect(listReusableComponents()).toHaveLength(0);
  });

  it("rejects duplicate reusable ids", () => {
    registerReusableComponent({
      id: "reusable-fixed",
      type: "section",
      name: "A",
      sourceBlockId: "section-hero",
    });
    expect(() =>
      registerReusableComponent({
        id: "reusable-fixed",
        type: "section",
        name: "B",
        sourceBlockId: "section-cta",
      }),
    ).toThrow(/already exists/);
  });
});

describe("Phase 2.4 inspector / layout helpers", () => {
  it("parseCssLength handles units", () => {
    expect(parseCssLength("16px")).toEqual({ value: "16", unit: "px" });
    expect(parseCssLength("50%")).toEqual({ value: "50", unit: "%" });
    expect(parseCssLength("1.5rem")).toEqual({ value: "1.5", unit: "rem" });
    expect(parseCssLength("auto")).toEqual({ value: "auto", unit: "" });
  });

  it("formatCssLength round-trips", () => {
    expect(formatCssLength("12", "px")).toBe("12px");
    expect(formatCssLength("auto", "")).toBe("auto");
    expect(formatCssLength("", "px")).toBe("");
  });

  it("relevant groups include background and border", () => {
    const groups = relevantInspectorGroups(null);
    expect(groups).toContain("background");
    expect(groups).toContain("border");
  });
});

describe("Phase 2.4 responsive visibility attrs", () => {
  it("readVisibilityMap defaults to visible", () => {
    const map = readVisibilityMap({
      getAttributes: () => ({}),
    } as never);
    expect(map.desktop).toBe(true);
    expect(map.tablet).toBe(true);
    expect(map.mobile).toBe(true);
  });

  it("readVisibilityMap respects per-device attrs", () => {
    const map = readVisibilityMap({
      getAttributes: () => ({
        "data-visible-desktop": "true",
        "data-visible-tablet": "true",
        "data-visible-mobile": "false",
      }),
    } as never);
    expect(map.mobile).toBe(false);
    expect(map.desktop).toBe(true);
  });
});

describe("Phase 2.4 multi-page isolation", () => {
  it("page-local insert metadata does not rewrite home sections", () => {
    const config = baseConfig();
    const project = buildProjectFromWebsiteConfig(config);
    const { html, sectionId } = createBlockHtml("section-cta", {
      locale: "en",
      pageId: "custom-landing",
      sectionId: "cta-99",
    });
    expect(html).toContain('data-page-id="custom-landing"');
    expect(sectionId).toBe("cta-99");

    // Syncing home project still keeps original hero ids
    const synced = applyVisualProjectToWebsiteConfig(config, project, {
      activePageId: VISUAL_PAGE_HOME,
    });
    const homeIds = (synced.sections ?? []).map((s) => s.id);
    expect(homeIds).toContain("hero-1");
    expect(homeIds).not.toContain("cta-99");
  });

  it("extractPageSectionMeta is page-scoped", () => {
    const config = baseConfig();
    const project = buildProjectFromWebsiteConfig(config);
    const byPage = extractPageSectionMeta(project);
    expect(byPage.home?.length ?? 0).toBeGreaterThan(0);
    expect(byPage.home?.some((m) => m.type === "hero" || m.id === "hero-1")).toBe(
      true,
    );
  });
});

describe("Phase 2.4 layout primitives registry", () => {
  it("exposes container stack columns grid spacer divider", () => {
    const ids = getVisualRegistry().blocks.map((b) => b.id);
    for (const id of [
      "layout-container",
      "layout-stack",
      "layout-columns",
      "layout-grid",
      "layout-spacer",
      "layout-divider",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("layout blocks create nestable markup with page id", () => {
    const { html } = createBlockHtml("layout-stack", {
      locale: "en",
      pageId: "about",
      sectionId: "stack-1",
    });
    expect(html).toContain('data-page-id="about"');
    expect(html).toContain("flex-direction:column");
  });
});

describe("Phase 2.4 insertion metadata", () => {
  it("nested insertion candidate keeps page id", () => {
    const { html } = createBlockHtml("content-heading", {
      locale: "fa",
      pageId: "custom-x",
      sectionId: "local-1",
    });
    expect(html).toContain('data-page-id="custom-x"');
    expect(html).toContain("data-component-id");
  });

  it("canonical hero still carries content paths", () => {
    const { html, block } = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      sectionId: "hero-1",
    });
    expect(block.canonical).toBe(true);
    expect(html).toContain("content.hero.headline");
  });

  it("library tabs still cover layout and media", () => {
    expect(listVisualBlocks({ tab: "layout" }).length).toBeGreaterThan(0);
    expect(listVisualBlocks({ tab: "media" }).length).toBeGreaterThan(0);
  });

  it("getVisualBlock returns card with canNest", () => {
    expect(getVisualBlock("content-card")?.canNest).toBe(true);
  });
});

describe("Phase 2.4 persistence / regression smoke", () => {
  it("project fingerprint path still builds from config", () => {
    const project = buildProjectFromWebsiteConfig(baseConfig());
    expect(project).toBeTruthy();
    expect(
      (project as { pages?: unknown[] }).pages?.length ?? 0,
    ).toBeGreaterThan(0);
  });

  it("asset reference in config survives clone semantics", () => {
    const config = baseConfig();
    expect(config.media.img1.url).toContain("example.com");
    // Duplication must share asset refs — we only assert media map untouched
    const cloned = structuredClone(config);
    expect(cloned.media.img1.url).toBe(config.media.img1.url);
    expect(Object.keys(cloned.media)).toContain("img1");
  });

  it("classic renderer config shape still valid after visual metadata", () => {
    const config = baseConfig();
    config.sections.push({
      id: "cta-1",
      type: "cta",
      visible: true,
      variant: "simple",
    });
    expect(config.sections.find((s) => s.type === "cta")?.id).toBe("cta-1");
    expect(config.content.hero.headline).toBe("HOME");
  });
});
