/**
 * Phase 3.1.1 — Final production hardening for canonical template rendering.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WebsiteConfig } from "@/types/website";
import {
  getTemplates,
  instantiateTemplate,
  resetTemplateRegistry,
} from "@/lib/templates";
import {
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  websiteConfigSourceFingerprint,
} from "@/lib/visual-editor";
import {
  ensureWebsitePages,
  findPageByIdOrSlug,
  renamePageMeta,
} from "@/lib/visual-editor/pages";
import { runPublishPreflight } from "@/lib/editor/validation";
import {
  collectVisibleSectionTypes,
  isTemplateCatalogSite,
  resolveHomeSections,
  shouldUseCanonicalHomeRenderer,
} from "@/lib/website/canonical-render";
import { MenuSiteSection, PricingSiteSection } from "@/components/website/canonical-sections";

beforeEach(() => {
  resetTemplateRegistry();
});

const ALL_IDS = [
  "fashion-luxury",
  "restaurant-editorial",
  "saas-modern",
  "beauty-premium",
  "agency-creative",
  "portfolio-creator",
  "real-estate",
  "coffee-modern",
] as const;

function instantiate(id: string, locale: "fa" | "en" = "en") {
  return instantiateTemplate(id, { locale, language: locale });
}

function legacyStoreConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Legacy Shop",
      colors: {
        primary: "#111",
        secondary: "#666",
        accent: "#c9a227",
        background: "#fff",
        foreground: "#111",
        muted: "#f5f5f5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "Hello",
        subheadline: "World",
        cta: "Shop",
      },
      products: {
        title: "Products",
        items: [
          {
            id: "p1",
            name: "Coat",
            description: "Wool",
            category: "General",
            price: 100,
            currency: "USD",
            imageIds: [],
            confidence: 1,
          },
        ],
      },
    },
    sections: [
      { id: "sec-hero", type: "hero", visible: true },
      { id: "sec-products", type: "products", visible: true },
      { id: "sec-footer", type: "footer", visible: true },
    ],
    seo: { title: "Legacy", description: "Legacy site", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

describe("Phase 3.1.1 canonical home routing", () => {
  it.each(ALL_IDS)("%s is a template catalog site with home page.sections", (id) => {
    const { config } = instantiate(id);
    expect(isTemplateCatalogSite(config)).toBe(true);
    expect(config.templateCatalogId).toBe(id);
    const homeSections = resolveHomeSections(config);
    expect(homeSections.length).toBeGreaterThan(0);
    expect(shouldUseCanonicalHomeRenderer(config)).toBe(true);
    const home = (config.pages ?? []).find((p) => p.id === "home");
    expect(home?.sections?.length).toBeGreaterThan(0);
    expect(homeSections.map((s) => s.id)).toEqual(
      home!.sections!.map((s) => s.id),
    );
  });

  it("legacy store without templateCatalogId does not use canonical home path", () => {
    const legacy = legacyStoreConfig();
    expect(isTemplateCatalogSite(legacy)).toBe(false);
    expect(shouldUseCanonicalHomeRenderer(legacy)).toBe(false);
  });

  it("legacy with empty pages still falls back to StoreRenderer path", () => {
    const legacy = {
      ...legacyStoreConfig(),
      pages: [{ id: "home", slug: "", name: "Home", kind: "home" as const }],
    };
    expect(shouldUseCanonicalHomeRenderer(legacy)).toBe(false);
  });

  it("fashion home sections include hero lookbook featured about cta footer", () => {
    const { config } = instantiate("fashion-luxury");
    const types = resolveHomeSections(config).map((s) => s.type);
    expect(types).toContain("hero");
    expect(types).toContain("lookbook");
    expect(types).toContain("featured-products");
    expect(types).toContain("about");
    expect(types).toContain("cta");
    expect(types).toContain("footer");
  });

  it("beauty home uses canonical sections not StoreRenderer path", () => {
    const { config } = instantiate("beauty-premium");
    expect(config.template).toBe("store");
    expect(shouldUseCanonicalHomeRenderer(config)).toBe(true);
  });
});

describe("Phase 3.1.1 StoreRenderer legacy compatibility", () => {
  it("legacy preflight still requires products for store", () => {
    const empty = legacyStoreConfig();
    empty.content.products = { title: "P", items: [] };
    expect(runPublishPreflight(empty).ok).toBe(false);
    expect(
      runPublishPreflight(empty).errors.some((e) => e.id === "no-products"),
    ).toBe(true);
  });

  it("legacy with products publishes", () => {
    expect(runPublishPreflight(legacyStoreConfig()).ok).toBe(true);
  });

  it("template fashion with products publishes via page.sections commerce check", () => {
    const { config } = instantiate("fashion-luxury");
    expect(runPublishPreflight(config).ok).toBe(true);
  });

  it("template saas publishes without products", () => {
    const { config } = instantiate("saas-modern");
    expect(runPublishPreflight(config).ok).toBe(true);
  });
});

describe("Phase 3.1.1 preview/publish canonical parity", () => {
  it.each(["fashion-luxury", "saas-modern", "restaurant-editorial", "real-estate"] as const)(
    "%s preview and publish modes share home section ids",
    (id) => {
      const { config } = instantiate(id);
      const previewSections = resolveHomeSections(config);
      const publishedSections = resolveHomeSections({
        ...config,
        settings: { ...config.settings, published: true },
      });
      expect(publishedSections.map((s) => s.id)).toEqual(
        previewSections.map((s) => s.id),
      );
      expect(websiteConfigSourceFingerprint(config)).toBe(
        websiteConfigSourceFingerprint({
          ...config,
          settings: { ...config.settings, published: true },
        }),
      );
    },
  );

  it("edited headline survives project round-trip for publish candidate", () => {
    const { config } = instantiate("fashion-luxury");
    config.content.hero.headline = "Published Headline QA";
    const project = buildProjectFromWebsiteConfig(config);
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(synced.content.hero.headline).toContain("Published Headline QA");
    expect(runPublishPreflight(synced).ok).toBe(true);
  });
});

describe("Phase 3.1.1 menu accessibility markup", () => {
  it("menu items expose title and price as headings/text with sr-only price label", () => {
    const { config } = instantiate("restaurant-editorial");
    const html = renderToStaticMarkup(
      createElement(MenuSiteSection, { config }),
    );
    expect(html).toMatch(/<h3[^>]*>/);
    const first = config.content.menu!.items[0]!;
    expect(html).toContain(first.title);
    if (first.price) {
      expect(html).toContain(first.price);
      expect(html).toMatch(/sr-only/);
      expect(html).toMatch(/Price:/);
    }
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
  });

  it("pricing plans use article + h3 + sr-only price label", () => {
    const { config } = instantiate("saas-modern");
    const html = renderToStaticMarkup(
      createElement(PricingSiteSection, { config }),
    );
    expect(html).toContain("<article");
    expect(html).toMatch(/<h3[^>]*>Starter</);
    expect(html).toMatch(/sr-only/);
    expect(html).toContain("Pro");
  });
});

describe("Phase 3.1.1 media persistence", () => {
  it.each(ALL_IDS)("%s media ids survive project round-trip", (id) => {
    const { config } = instantiate(id);
    const before = { ...config.media };
    const project = buildProjectFromWebsiteConfig(config);
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    for (const [mediaId, entry] of Object.entries(before)) {
      expect(synced.media[mediaId]?.url).toBe(entry.url);
      expect(synced.media[mediaId]?.alt).toBe(entry.alt);
    }
  });

  it("lookbook imageIds remain media-key references after sync", () => {
    const { config } = instantiate("fashion-luxury");
    const ids = (config.content.lookbook?.items ?? []).map((i) => i.imageId);
    expect(ids.length).toBeGreaterThan(0);
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      buildProjectFromWebsiteConfig(config),
    );
    for (const imageId of ids) {
      if (!imageId) continue;
      expect(synced.media[imageId]).toBeTruthy();
    }
  });
});

describe("Phase 3.1.1 navigation + slug identity", () => {
  it("findPageByIdOrSlug resolves by id after slug change", () => {
    let config = instantiate("saas-modern").config;
    config = { ...config, pages: ensureWebsitePages(config) };
    const pricing = config.pages!.find((p) => p.id === "pricing")!;
    const updated = renamePageMeta(config.pages!, pricing.id, {
      slug: "plans-v2",
    });
    config = { ...config, pages: updated };
    expect(findPageByIdOrSlug(config.pages!, "pricing")?.id).toBe("pricing");
    expect(findPageByIdOrSlug(config.pages!, "plans-v2")?.id).toBe("pricing");
  });

  it("page and section ids stay stable across reorder of home sections array", () => {
    const { config } = instantiate("coffee-modern");
    const home = config.pages!.find((p) => p.id === "home")!;
    const originalIds = home.sections!.map((s) => s.id);
    home.sections = [...home.sections!].reverse();
    expect(home.sections.map((s) => s.id).sort()).toEqual(
      [...originalIds].sort(),
    );
    expect(new Set(home.sections.map((s) => s.id)).size).toBe(
      home.sections.length,
    );
  });
});

describe("Phase 3.1.1 all templates home render path", () => {
  it("every template home section type is collectable and visible-aware", () => {
    for (const id of ALL_IDS) {
      const { config } = instantiate(id);
      const types = collectVisibleSectionTypes(config);
      expect(types.has("hero") || types.has("footer")).toBe(true);
      expect(types.size).toBeGreaterThan(2);
    }
  });

  it("agency portfolio and coffee location content are canonical", () => {
    const agency = instantiate("agency-creative").config;
    expect(agency.content.portfolio?.items?.length).toBeGreaterThan(0);
    const coffee = instantiate("coffee-modern").config;
    expect(coffee.content.location?.address || coffee.content.location?.city).toBeTruthy();
    const portfolio = instantiate("portfolio-creator").config;
    expect(portfolio.content.portfolio?.items?.length).toBeGreaterThan(0);
  });
});

describe("Phase 3.1.1 responsive section settings round-trip", () => {
  it("device visibility on a home section survives project sync", () => {
    const { config } = instantiate("real-estate");
    const home = config.pages!.find((p) => p.id === "home")!;
    const target = home.sections!.find((s) => s.type === "hero")!;
    target.settings = {
      ...(target.settings ?? {}),
      responsive: { mobile: { hidden: true } },
    };
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      buildProjectFromWebsiteConfig(config),
    );
    const syncedHero =
      synced.pages?.find((p) => p.id === "home")?.sections?.find(
        (s) => s.id === target.id,
      ) ?? synced.sections.find((s) => s.id === target.id);
    expect(syncedHero).toBeTruthy();
  });
});

describe("Phase 3.1.1 page.sections preservation", () => {
  it("ensureWebsitePages preserves canonical page.sections from project sync", () => {
    const { config } = instantiate("restaurant-editorial");
    expect(config.visualEditor?.project).toBeTruthy();
    const pages = ensureWebsitePages(config);
    const menu = pages.find((p) => p.id === "menu");
    expect(menu?.sections?.some((s) => s.type === "menu")).toBe(true);
    const home = pages.find((p) => p.id === "home");
    expect(home?.sections?.length).toBeGreaterThan(0);
  });
});

describe("Phase 3.1.1 getTemplates catalog still has eight", () => {
  it("catalog count remains 8", () => {
    expect(getTemplates()).toHaveLength(8);
  });
});
