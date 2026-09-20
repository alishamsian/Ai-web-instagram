/**
 * Phase 2.3 — professional builder UX foundation tests.
 */

import { describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  createBlockHtml,
  defaultVariantId,
  getVisualBlock,
  getVisualRegistry,
  listVisualBlocks,
  nextSectionId,
  registryAsGrapesBlocks,
  resolveVariantId,
  resolveVisualDesignTokens,
  visualDesignTokenCssVars,
  visualDesignTokenStyleTag,
  setComponentStyle,
  relevantInspectorGroups,
  HERO_VARIANTS,
  CTA_VARIANTS,
  VISUAL_PAGE_HOME,
  buildProjectFromWebsiteConfig,
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
    media: {},
  };
}

describe("Phase 2.3 registry", () => {
  it("contains required library tabs/categories", () => {
    const tabs = new Set(getVisualRegistry().blocks.map((b) => b.libraryTab));
    expect(tabs.has("sections")).toBe(true);
    expect(tabs.has("components")).toBe(true);
    expect(tabs.has("layout")).toBe(true);
    expect(tabs.has("media")).toBe(true);
  });

  it("every block has a unique id", () => {
    const ids = getVisualRegistry().blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every variant id is unique within its block", () => {
    for (const block of getVisualRegistry().blocks) {
      const vids = (block.variants ?? []).map((v) => v.id);
      expect(new Set(vids).size).toBe(vids.length);
    }
  });

  it("rejects unknown block creation", () => {
    expect(() =>
      createBlockHtml("does-not-exist", { locale: "en", pageId: "home" }),
    ).toThrow(/Unknown visual block/);
  });

  it("block creation produces stable metadata", () => {
    const { html, sectionId, block } = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      existingSectionIds: ["hero-1"],
    });
    expect(block.id).toBe("section-hero");
    expect(sectionId).toBe("hero-2");
    expect(html).toContain(`data-section-id="${sectionId}"`);
    expect(html).toContain('data-section-type="hero"');
    expect(html).toContain('data-page-id="home"');
    expect(html).toContain("data-component-id=");
    expect(html).toContain('data-content-path="content.hero.headline"');
  });

  it("lists sections for search Hero", () => {
    const hits = listVisualBlocks({ tab: "sections", query: "hero" });
    expect(hits.some((b) => b.id === "section-hero")).toBe(true);
  });

  it("lists layout blocks", () => {
    const layout = listVisualBlocks({ tab: "layout" });
    expect(layout.some((b) => b.id === "layout-container")).toBe(true);
    expect(layout.some((b) => b.id === "layout-columns")).toBe(true);
  });
});

describe("Phase 2.3 insertion metadata", () => {
  it("click-style creation targets provided page id", () => {
    const { html } = createBlockHtml("content-heading", {
      locale: "en",
      pageId: "services",
      sectionId: "heading-local-1",
    });
    expect(html).toContain('data-page-id="services"');
    expect(html).toContain('data-component-id="heading-local-1__heading"');
  });

  it("insertion gets stable component ids from section+role", () => {
    const a = createBlockHtml("section-about", {
      locale: "en",
      pageId: "home",
      sectionId: "about-9",
    });
    const b = createBlockHtml("section-about", {
      locale: "en",
      pageId: "home",
      sectionId: "about-9",
    });
    expect(a.html).toContain('data-component-id="about-9__title"');
    expect(b.html).toContain('data-component-id="about-9__title"');
  });

  it("serialized section survives project sync registration", () => {
    const config = baseConfig();
    const { html, sectionId } = createBlockHtml("section-cta", {
      locale: "en",
      pageId: VISUAL_PAGE_HOME,
      existingSectionIds: config.sections.map((s) => s.id),
    });
    const project = {
      pages: [
        {
          id: "home",
          name: "Home",
          frames: [{ component: html }],
        },
      ],
    };
    const next = applyVisualProjectToWebsiteConfig(config, project, {
      activePageId: "home",
    });
    expect(next.sections.some((s) => s.id === sectionId && s.type === "cta")).toBe(
      true,
    );
  });

  it("custom page insert does not add to WebsiteConfig sections via home-only sync", () => {
    const config = baseConfig();
    const before = config.sections.map((s) => s.id);
    const { html, sectionId } = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "services",
      existingSectionIds: before,
    });
    const project = {
      pages: [
        {
          id: "home",
          name: "Home",
          frames: [
            {
              component: `<section data-section-id="hero-1" data-section-type="hero"></section>`,
            },
          ],
        },
        {
          id: "services",
          name: "Services",
          frames: [{ component: html }],
        },
      ],
    };
    const next = applyVisualProjectToWebsiteConfig(config, project, {
      activePageId: "services",
    });
    expect(next.sections.some((s) => s.id === sectionId)).toBe(false);
    const byPage = extractPageSectionMeta(project);
    expect(byPage.services?.some((s) => s.id === sectionId)).toBe(true);
  });

  it("nextSectionId increments deterministically", () => {
    expect(nextSectionId("hero", ["hero-1", "hero-3"])).toBe("hero-4");
    expect(nextSectionId("cta", [])).toBe("cta-1");
  });
});

describe("Phase 2.3 variants", () => {
  it("default and resolve variant ids", () => {
    expect(defaultVariantId(HERO_VARIANTS)).toBe("minimal");
    expect(resolveVariantId(HERO_VARIANTS, "split")).toBe("split");
    expect(resolveVariantId(HERO_VARIANTS, "nope")).toBe("minimal");
    expect(defaultVariantId(CTA_VARIANTS)).toBe("simple");
  });

  it("variant identity persists in markup", () => {
    const { html } = createBlockHtml("section-hero", {
      locale: "en",
      pageId: "home",
      sectionId: "hero-v",
      variantId: "split",
    });
    expect(html).toContain('data-section-variant="split"');
    expect(html).toContain("grid-template-columns");
  });

  it("variant switching path keeps section id", () => {
    const split = createBlockHtml("section-testimonials", {
      locale: "en",
      pageId: "home",
      sectionId: "testimonials-1",
      variantId: "cards",
    });
    const quote = createBlockHtml("section-testimonials", {
      locale: "en",
      pageId: "home",
      sectionId: "testimonials-1",
      variantId: "quote",
    });
    expect(split.html).toContain('data-section-id="testimonials-1"');
    expect(quote.html).toContain('data-section-id="testimonials-1"');
    expect(split.html).toContain('data-section-variant="cards"');
    expect(quote.html).toContain('data-section-variant="quote"');
  });

  it("getVisualBlock exposes hero variants", () => {
    const hero = getVisualBlock("section-hero");
    expect(hero?.variants?.map((v) => v.id)).toContain("editorial");
  });
});

describe("Phase 2.3 design tokens", () => {
  it("resolves tokens from brand config", () => {
    const tokens = resolveVisualDesignTokens(baseConfig());
    expect(tokens.colors.primary).toBe("#111111");
    expect(tokens.spacing.md).toBe("16px");
    expect(tokens.containers.default).toBe("1100px");
    expect(tokens.radius.md).toBeTruthy();
  });

  it("token css vars include ve color/spacing/radius", () => {
    const vars = visualDesignTokenCssVars(resolveVisualDesignTokens(baseConfig()));
    expect(vars["--ve-color-primary"]).toBe("#111111");
    expect(vars["--ve-space-lg"]).toBe("24px");
    expect(vars["--ve-radius-md"]).toBeTruthy();
  });

  it("style tag does not invent mandatory overrides for legacy inline styles", () => {
    const css = visualDesignTokenStyleTag(resolveVisualDesignTokens(baseConfig()));
    expect(css).toContain(":root{");
    expect(css).toContain("--ve-color-accent:");
  });

  it("layout block references token vars", () => {
    const { html } = createBlockHtml("layout-container", {
      locale: "en",
      pageId: "home",
      sectionId: "layout-1",
    });
    expect(html).toContain("var(--ve-container-default");
  });
});

describe("Phase 2.3 inspector helpers", () => {
  it("rejects unsafe style props", () => {
    const fake = {
      getStyle: () => ({}),
      addStyle: () => undefined,
      removeStyle: () => undefined,
    } as never;
    expect(setComponentStyle(fake, "behavior", "url(x)")).toBe(false);
    expect(setComponentStyle(fake, "width", "320px")).toBe(true);
  });

  it("relevant groups include content for text-like nodes", () => {
    const fake = {
      is: () => false,
      get: (k: string) => (k === "tagName" ? "h1" : ""),
      getAttributes: () => ({ "data-content-path": "content.hero.headline" }),
    } as never;
    const groups = relevantInspectorGroups(fake);
    expect(groups).toContain("content");
    expect(groups).toContain("typography");
  });
});

describe("Phase 2.3 pages + projection regression", () => {
  it("buildProjectFromWebsiteConfig still projects home/about", () => {
    const project = buildProjectFromWebsiteConfig(baseConfig());
    const pages = (project as { pages?: Array<{ id: string }> }).pages ?? [];
    expect(pages.some((p) => p.id === "home")).toBe(true);
    expect(pages.some((p) => p.id === "about")).toBe(true);
  });

  it("canonical section create includes content paths for sync", () => {
    const { html } = createBlockHtml("section-faq", {
      locale: "en",
      pageId: "home",
      sectionId: "faq-1",
    });
    expect(html).toContain('data-content-path="content.faq.title"');
  });

  it("commerce section blocks are registered", () => {
    const ids = getVisualRegistry().blocks.map((b) => b.id);
    expect(ids).toContain("section-products");
    expect(ids).toContain("section-featured-products");
    expect(ids).toContain("section-lookbook");
    expect(ids).toContain("section-shop-the-look");
    expect(ids).toContain("section-categories");
  });

  it("media blocks exist", () => {
    expect(getVisualBlock("media-image")).toBeTruthy();
    expect(getVisualBlock("media-video")).toBeTruthy();
  });

  it("footer and contact sections are canonical", () => {
    expect(getVisualBlock("section-footer")?.canonical).toBe(true);
    expect(getVisualBlock("section-contact")?.sectionType).toBe("contact");
  });

  it("component button uses brand primary when provided", () => {
    const { html } = createBlockHtml("content-button", {
      locale: "en",
      pageId: "home",
      sectionId: "btn-1",
      colors: {
        primary: "#abcdef",
        secondary: "#fff",
        accent: "#f00",
        background: "#fff",
        foreground: "#000",
        muted: "#eee",
      },
    });
    expect(html).toContain("#abcdef");
  });

  it("spacing/layout inspector groups always present for non-wrapper", () => {
    const fake = {
      is: () => false,
      get: () => "div",
      getAttributes: () => ({}),
    } as never;
    const groups = relevantInspectorGroups(fake);
    expect(groups).toContain("layout");
    expect(groups).toContain("spacing");
    expect(groups).toContain("responsive");
  });

  it("advanced group appears for section nodes", () => {
    const fake = {
      is: () => false,
      get: () => "section",
      getAttributes: () => ({
        "data-section-id": "hero-1",
        "data-section-variant": "minimal",
      }),
    } as never;
    expect(relevantInspectorGroups(fake)).toContain("advanced");
  });

  it("registryAsGrapesBlocks produces unique Grapes ids", () => {
    const grapes = registryAsGrapesBlocks("en");
    const ids = grapes.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(grapes.every((b) => b.content.length > 0)).toBe(true);
  });
});
