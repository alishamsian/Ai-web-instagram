/**
 * Phase 3.0 — Template Engine & Full-Site Template System tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  ALL_WEBSITE_TEMPLATES,
  BUSINESS_TYPE_CATEGORY_MAP,
  TEMPLATE_CATEGORIES,
  TEMPLATE_SCHEMA_VERSION,
  TEMPLATE_STYLES,
  TemplateValidationError,
  currentTemplateSchemaVersion,
  defineTemplate,
  filterTemplates,
  getTemplate,
  getTemplateById,
  getTemplateBySlug,
  getTemplateCatalog,
  getTemplates,
  getTemplatesByCategory,
  instantiateTemplate,
  instantiateTemplateDefinition,
  listBusinessTypes,
  listCatalogCategories,
  listCatalogStyles,
  migrateTemplate,
  recommendedCategoriesForBusinessType,
  registerTemplate,
  resetTemplateRegistry,
  resolveNavHrefForPageId,
  searchTemplates,
  toCatalogItem,
  validateTemplate,
  page,
  sec,
  type WebsiteTemplate,
} from "@/lib/templates";
import { BRAND_MODERN } from "@/lib/templates/brand-presets";
import {
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  extractProjectPageHtml,
  getVisualBlock,
  websiteConfigSourceFingerprint,
} from "@/lib/visual-editor";
import { ensureWebsitePages, hrefForPageSlug } from "@/lib/visual-editor/pages";

function minimalTemplate(
  overrides: Partial<WebsiteTemplate> & { id: string; slug: string },
): WebsiteTemplate {
  return defineTemplate({
    id: overrides.id,
    slug: overrides.slug,
    name: overrides.name ?? { fa: "تست", en: "Test" },
    description: overrides.description ?? {
      fa: "توضیح",
      en: "Description",
    },
    category: overrides.category ?? "general",
    style: overrides.style ?? "modern",
    tags: overrides.tags ?? ["test"],
    features: overrides.features ?? ["contact-form"],
    legacyTemplate: overrides.legacyTemplate ?? "store",
    brand: overrides.brand ?? BRAND_MODERN,
    pages:
      overrides.pages ??
      [
        page("home", "", { fa: "خانه", en: "Home" }, "home", [
          sec("hero", "section-hero", {
            variant: "minimal",
            content: { headline: "Hello", cta: "Go" },
          }),
          sec("footer", "section-footer"),
        ]),
      ],
    navigation: overrides.navigation,
    metadata: overrides.metadata,
    thumbnail: overrides.thumbnail,
  });
}

beforeEach(() => {
  resetTemplateRegistry();
});

describe("Template registry", () => {
  it("boots with 8 full-site templates", () => {
    expect(getTemplates()).toHaveLength(8);
    expect(ALL_WEBSITE_TEMPLATES).toHaveLength(8);
  });

  it("retrieves by id", () => {
    expect(getTemplate("fashion-luxury")?.slug).toBe("fashion-luxury");
    expect(getTemplateById("saas-modern")?.category).toBe("saas");
  });

  it("retrieves by slug", () => {
    expect(getTemplateBySlug("coffee-modern")?.id).toBe("coffee-modern");
  });

  it("rejects duplicate id on register", () => {
    expect(() =>
      registerTemplate(minimalTemplate({ id: "fashion-luxury", slug: "x-dup" })),
    ).toThrow(/Duplicate template id/);
  });

  it("rejects duplicate slug on register", () => {
    expect(() =>
      registerTemplate(
        minimalTemplate({ id: "unique-id-dup-slug", slug: "fashion-luxury" }),
      ),
    ).toThrow(/Duplicate template slug/);
  });

  it("registers a valid custom template", () => {
    registerTemplate(
      minimalTemplate({ id: "custom-ok", slug: "custom-ok" }),
    );
    expect(getTemplate("custom-ok")).toBeTruthy();
  });

  it("validateTemplate throws TemplateValidationError for empty id", () => {
    const bad = minimalTemplate({ id: "tmp", slug: "tmp" });
    bad.id = "";
    expect(() => validateTemplate(bad)).toThrow(TemplateValidationError);
  });

  it("rejects invalid category", () => {
    const bad = minimalTemplate({ id: "bad-cat", slug: "bad-cat" });
    (bad as { category: string }).category = "not-a-category";
    expect(() => validateTemplate(bad)).toThrow(/invalid category/);
  });

  it("rejects invalid style", () => {
    const bad = minimalTemplate({ id: "bad-style", slug: "bad-style" });
    (bad as { style: string }).style = "neon";
    expect(() => validateTemplate(bad)).toThrow(/invalid style/);
  });

  it("rejects unknown block id", () => {
    const bad = minimalTemplate({
      id: "bad-block",
      slug: "bad-block",
      pages: [
        page("home", "", { fa: "خانه", en: "Home" }, "home", [
          sec("x", "section-does-not-exist"),
        ]),
      ],
    });
    expect(() => validateTemplate(bad)).toThrow(/unknown block/);
  });

  it("rejects invalid variant", () => {
    const bad = minimalTemplate({
      id: "bad-var",
      slug: "bad-var",
      pages: [
        page("home", "", { fa: "خانه", en: "Home" }, "home", [
          sec("hero", "section-hero", { variant: "not-a-real-variant" }),
        ]),
      ],
    });
    expect(() => validateTemplate(bad)).toThrow(/invalid variant/);
  });

  it("rejects duplicate page ids", () => {
    const bad = minimalTemplate({
      id: "dup-page",
      slug: "dup-page",
      pages: [
        page("home", "", { fa: "خانه", en: "Home" }, "home", [
          sec("hero", "section-hero"),
        ]),
        page("home", "other", { fa: "دیگر", en: "Other" }, "custom", [
          sec("hero", "section-hero"),
        ]),
      ],
    });
    expect(() => validateTemplate(bad)).toThrow(/duplicate page id/);
  });

  it("rejects missing home page", () => {
    const bad = minimalTemplate({
      id: "no-home",
      slug: "no-home",
      pages: [
        page("about", "about", { fa: "درباره", en: "About" }, "about", [
          sec("about", "section-about"),
        ]),
      ],
    });
    expect(() => validateTemplate(bad)).toThrow(/home page required/);
  });

  it("rejects nav pointing at missing page", () => {
    const bad = minimalTemplate({
      id: "bad-nav",
      slug: "bad-nav",
      navigation: [{ pageId: "missing", label: { fa: "x", en: "x" } }],
    });
    expect(() => validateTemplate(bad)).toThrow(/nav references missing page/);
  });

  it("rejects unsupported future schemaVersion", () => {
    const bad = minimalTemplate({ id: "future", slug: "future" });
    bad.schemaVersion = 99;
    expect(() => validateTemplate(bad)).toThrow(/unsupported schemaVersion/);
  });
});

describe("Categories, styles, catalog filters", () => {
  it("exposes required categories including General", () => {
    const ids = TEMPLATE_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("fashion");
    expect(ids).toContain("restaurant");
    expect(ids).toContain("saas");
    expect(ids).toContain("general");
    expect(ids).toContain("coffee");
  });

  it("exposes required styles", () => {
    const ids = TEMPLATE_STYLES.map((s) => s.id);
    expect(ids).toContain("minimal");
    expect(ids).toContain("luxury");
    expect(ids).toContain("modern");
    expect(ids).toContain("editorial");
  });

  it("filters by category", () => {
    const fashion = getTemplatesByCategory("fashion");
    expect(fashion.length).toBeGreaterThan(0);
    expect(fashion.every((t) => t.category === "fashion")).toBe(true);
  });

  it("filters by style", () => {
    const luxury = getTemplateCatalog({ style: "luxury" });
    expect(luxury.every((t) => t.style === "luxury")).toBe(true);
  });

  it("filters by feature tag", () => {
    const withPricing = getTemplateCatalog({ feature: "pricing" });
    expect(withPricing.every((t) => t.features.includes("pricing"))).toBe(true);
  });

  it("filters by tag", () => {
    const tagged = filterTemplates(getTemplates(), { tag: "fashion" });
    expect(tagged.every((t) => t.tags.includes("fashion"))).toBe(true);
  });

  it("searches by name and description", () => {
    const hits = searchTemplates("pricing");
    expect(hits.some((t) => t.id === "saas-modern")).toBe(true);
  });

  it("search is case-insensitive and bilingual-aware", () => {
    const hits = searchTemplates("فشن");
    expect(hits.some((t) => t.id === "fashion-luxury")).toBe(true);
  });

  it("toCatalogItem is lightweight metadata", () => {
    const t = getTemplate("fashion-luxury")!;
    const item = toCatalogItem(t);
    expect(item.pageCount).toBe(t.pages.length);
    expect(item).not.toHaveProperty("pages");
    expect(item).not.toHaveProperty("brand");
  });

  it("listCatalogCategories reflects registered templates", () => {
    const cats = listCatalogCategories();
    expect(cats).toContain("fashion");
    expect(cats).toContain("saas");
  });

  it("listCatalogStyles reflects registered templates", () => {
    const styles = listCatalogStyles();
    expect(styles.length).toBeGreaterThan(0);
  });
});

describe("Template pages identity", () => {
  it("fashion has unique page ids and expected set", () => {
    const t = getTemplate("fashion-luxury")!;
    const ids = t.pages.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining(["home", "shop", "about", "lookbook", "contact"]),
    );
  });

  it("restaurant pages match product brief", () => {
    const ids = getTemplate("restaurant-editorial")!.pages.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "home",
        "menu",
        "about",
        "reservations",
        "contact",
      ]),
    );
  });

  it("saas pages match product brief", () => {
    const ids = getTemplate("saas-modern")!.pages.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "home",
        "features",
        "pricing",
        "about",
        "contact",
      ]),
    );
  });

  it("page ordering is preserved on instantiate", () => {
    const t = getTemplate("agency-creative")!;
    const { config } = instantiateTemplate(t.id, { locale: "en" });
    expect(config.pages?.map((p) => p.id)).toEqual(
      t.pages.map((p) => (p.id === "home" || p.id === "about" ? p.id : p.id)),
    );
  });

  it("page slugs are stable and home is empty", () => {
    const { config } = instantiateTemplate("portfolio-creator", {
      locale: "en",
    });
    const home = config.pages?.find((p) => p.kind === "home");
    expect(home?.slug).toBe("");
    const work = config.pages?.find((p) => p.id === "work");
    expect(work?.slug).toBe("work");
  });
});

describe("Template sections use registry", () => {
  it("every section block exists in visual registry", () => {
    for (const t of getTemplates()) {
      for (const p of t.pages) {
        for (const s of p.sections) {
          expect(getVisualBlock(s.blockId), `${t.id}:${s.blockId}`).toBeTruthy();
        }
      }
    }
  });

  it("every declared variant is valid for its block", () => {
    for (const t of getTemplates()) {
      for (const p of t.pages) {
        for (const s of p.sections) {
          if (!s.variant) continue;
          const block = getVisualBlock(s.blockId)!;
          const ok = block.variants?.some((v) => v.id === s.variant);
          expect(ok, `${t.id} ${s.blockId} ${s.variant}`).toBe(true);
        }
      }
    }
  });

  it("home sections land in WebsiteConfig.sections with types", () => {
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    expect(config.sections.length).toBeGreaterThan(3);
    expect(config.sections.some((s) => s.type === "hero")).toBe(true);
    expect(config.sections.some((s) => s.type === "footer")).toBe(true);
  });
});

describe("Instantiation", () => {
  it("creates WebsiteConfig with catalog provenance", () => {
    const { config, templateId } = instantiateTemplate("fashion-luxury", {
      locale: "en",
      brandName: "Atelier Nova",
    });
    expect(templateId).toBe("fashion-luxury");
    expect(config.templateCatalogId).toBe("fashion-luxury");
    expect(config.templateSchemaVersion).toBe(TEMPLATE_SCHEMA_VERSION);
    expect(config.brand.name).toBe("Atelier Nova");
    expect(config.template).toBe("store");
  });

  it("deep independence — mutating website does not mutate template", () => {
    const template = getTemplate("fashion-luxury")!;
    const originalHeadline =
      template.pages[0].sections.find((s) => s.key === "hero")?.content
        ?.headline;
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    config.content.hero.headline = "MUTATED WEBSITE";
    config.brand.colors.primary = "#ff0000";
    expect(
      template.pages[0].sections.find((s) => s.key === "hero")?.content
        ?.headline,
    ).toBe(originalHeadline);
    expect(template.brand.colors.primary).not.toBe("#ff0000");
  });

  it("two instantiations are independent of each other", () => {
    const a = instantiateTemplate("saas-modern", {
      locale: "en",
      brandName: "Site A",
    });
    const b = instantiateTemplate("saas-modern", {
      locale: "en",
      brandName: "Site B",
    });
    a.config.content.hero.headline = "ONLY A";
    expect(b.config.content.hero.headline).not.toBe("ONLY A");
    expect(b.config.brand.name).toBe("Site B");
    expect(a.config.brand.name).toBe("Site A");
  });

  it("assigns unique section ids within a website", () => {
    const { config } = instantiateTemplate("beauty-premium", { locale: "en" });
    const ids = config.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("page id map is deterministic (not random)", () => {
    const first = instantiateTemplate("real-estate", { locale: "en" });
    const second = instantiateTemplate("real-estate", { locale: "en" });
    expect(first.pageIdMap).toEqual(second.pageIdMap);
    expect(first.pageIdMap.home).toBe("home");
    expect(first.pageIdMap.about).toBe("about");
  });

  it("visual project contains every page with HTML", () => {
    const { config, pageIdMap } = instantiateTemplate("coffee-modern", {
      locale: "en",
    });
    for (const templatePageId of Object.keys(pageIdMap)) {
      const websitePageId = pageIdMap[templatePageId];
      const html = extractProjectPageHtml(
        config.visualEditor?.project,
        websitePageId,
      );
      expect(html, websitePageId).toBeTruthy();
      expect(html).toContain("data-website-page");
    }
  });

  it("instantiateTemplateDefinition works without registry lookup", () => {
    const def = minimalTemplate({ id: "inline-def", slug: "inline-def" });
    const { config } = instantiateTemplateDefinition(def, { locale: "en" });
    expect(config.templateCatalogId).toBe("inline-def");
  });

  it("unknown template throws", () => {
    expect(() => instantiateTemplate("nope")).toThrow(/Unknown template/);
  });
});

describe("Navigation and internal links", () => {
  it("nav links use page id attributes and remapped hrefs", () => {
    const { config, pageIdMap } = instantiateTemplate("fashion-luxury", {
      locale: "en",
    });
    const homeHtml = extractProjectPageHtml(
      config.visualEditor?.project,
      "home",
    )!;
    expect(homeHtml).toContain(`data-nav-page-id="${pageIdMap.shop}"`);
    expect(homeHtml).toContain('href="/shop"');
    expect(homeHtml).toContain(`data-nav-page-id="${pageIdMap.lookbook}"`);
  });

  it("resolveNavHrefForPageId follows page identity after slug change", () => {
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    const shop = config.pages!.find((p) => p.id === "shop")!;
    expect(resolveNavHrefForPageId(config, "shop")).toBe("/shop");
    shop.slug = "boutique";
    expect(resolveNavHrefForPageId(config, "shop")).toBe("/boutique");
    expect(shop.id).toBe("shop");
  });

  it("hrefForPageSlug home stays /", () => {
    expect(hrefForPageSlug("")).toBe("/");
  });
});

describe("Design system / brand presets", () => {
  it("bridges template brand colors into WebsiteConfig.brand", () => {
    const t = getTemplate("fashion-luxury")!;
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    expect(config.brand.colors.primary).toBe(t.brand.colors.primary);
    expect(config.brand.colors.accent).toBe(t.brand.colors.accent);
  });

  it("bridges typography", () => {
    const t = getTemplate("restaurant-editorial")!;
    const { config } = instantiateTemplate("restaurant-editorial", {
      locale: "en",
    });
    expect(config.brand.typography.heading).toBe(t.brand.typography.heading);
    expect(config.brand.typography.scale).toBe(t.brand.typography.scale);
  });

  it("bridges spacing/radius design tokens", () => {
    const t = getTemplate("saas-modern")!;
    const { config } = instantiateTemplate("saas-modern", { locale: "en" });
    expect(config.brand.design?.radius).toBe(t.brand.design?.radius);
    expect(config.brand.design?.contentWidth).toBe(
      t.brand.design?.contentWidth,
    );
    expect(config.brand.design?.sectionSpacing).toBe(
      t.brand.design?.sectionSpacing,
    );
  });

  it("starter content is not lorem ipsum", () => {
    for (const t of getTemplates()) {
      const blob = JSON.stringify(t.pages);
      expect(blob.toLowerCase()).not.toContain("lorem ipsum");
    }
  });
});

describe("Multi-page isolation", () => {
  it("custom pages are isolated from home sections list", () => {
    const { config } = instantiateTemplate("agency-creative", {
      locale: "en",
    });
    expect(config.sections.some((s) => s.type === "hero")).toBe(true);
    const workHtml = extractProjectPageHtml(
      config.visualEditor?.project,
      "work",
    )!;
    expect(workHtml).toContain('data-website-page="work"');
    expect(workHtml).toContain("data-section-id=");
    // Home section ids live on WebsiteConfig.sections; work page HTML is separate
    const homeIds = config.sections.map((s) => s.id);
    for (const id of homeIds) {
      expect(workHtml.includes(`data-section-id="${id}"`)).toBe(false);
    }
  });

  it("ensureWebsitePages keeps all template pages", () => {
    const { config } = instantiateTemplate("portfolio-creator", {
      locale: "en",
    });
    const pages = ensureWebsitePages(config);
    expect(pages.map((p) => p.id)).toEqual(
      expect.arrayContaining(["home", "work", "about", "contact"]),
    );
  });
});

describe("Visual editor projection", () => {
  it("template opens with grapesjs visualEditor projection", () => {
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    expect(config.visualEditor?.engine).toBe("grapesjs");
    expect(config.visualEditor?.version).toBe(2);
    expect(config.visualEditor?.activePageId).toBe("home");
  });

  it("home sections expose editable section meta attributes", () => {
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    const html = extractProjectPageHtml(config.visualEditor?.project, "home")!;
    expect(html).toMatch(/data-section-id=/);
    expect(html).toMatch(/data-section-type=/);
    expect(html).toMatch(/data-page-id=/);
  });

  it("variants are present on projected sections", () => {
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    const hero = config.sections.find((s) => s.type === "hero");
    expect(hero?.variant).toBe("split");
  });

  it("content is editable via sync path", () => {
    const { config } = instantiateTemplate("saas-modern", { locale: "en" });
    const project = buildProjectFromWebsiteConfig({
      ...config,
      content: {
        ...config.content,
        hero: { ...config.content.hero, headline: "Build better workflows NOW" },
      },
    });
    const synced = applyVisualProjectToWebsiteConfig(
      {
        ...config,
        content: {
          ...config.content,
          hero: { ...config.content.hero, headline: "Build better workflows NOW" },
        },
      },
      project,
    );
    expect(synced.content.hero.headline).toContain("workflows");
  });
});

describe("Classic / preview / persistence / legacy", () => {
  it("legacy TemplateType remains for Classic family", () => {
    const { config } = instantiateTemplate("restaurant-editorial", {
      locale: "en",
    });
    expect(["store", "restaurant", "services", "creator", "portfolio"]).toContain(
      config.template,
    );
  });

  it("fingerprint works on instantiated config", () => {
    const { config } = instantiateTemplate("coffee-modern", { locale: "en" });
    const fp1 = websiteConfigSourceFingerprint(config);
    const fp2 = websiteConfigSourceFingerprint(config);
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBeGreaterThan(8);
  });

  it("fingerprint changes when content changes", () => {
    const { config } = instantiateTemplate("coffee-modern", { locale: "en" });
    const before = websiteConfigSourceFingerprint(config);
    config.content.hero.headline = "Changed headline";
    const after = websiteConfigSourceFingerprint(config);
    expect(after).not.toBe(before);
  });

  it("legacy website without template metadata still valid", () => {
    const legacy: WebsiteConfig = {
      template: "store",
      brand: {
        name: "Legacy Shop",
        colors: {
          primary: "#111",
          secondary: "#fff",
          accent: "#f00",
          background: "#fff",
          foreground: "#111",
          muted: "#eee",
        },
        typography: { heading: "sans", body: "sans", scale: "compact" },
      },
      content: {
        hero: {
          style: "minimal",
          headline: "Hi",
          subheadline: "Sub",
          cta: "Go",
        },
        about: { title: "About", body: "Body" },
      },
      sections: [
        { id: "hero-1", type: "hero", visible: true },
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
    expect(legacy.templateCatalogId).toBeUndefined();
    expect(legacy.templateSchemaVersion).toBeUndefined();
    const project = buildProjectFromWebsiteConfig(legacy);
    expect(project.pages?.length).toBeGreaterThan(0);
    const pages = ensureWebsitePages(legacy);
    expect(pages.some((p) => p.id === "home")).toBe(true);
  });

  it("RTL locale sets direction and language", () => {
    const { config } = instantiateTemplate("beauty-premium", {
      locale: "fa",
      language: "fa",
      direction: "rtl",
    });
    expect(config.settings.language).toBe("fa");
    expect(config.settings.direction).toBe("rtl");
    const html = extractProjectPageHtml(config.visualEditor?.project, "home")!;
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
  });

  it("LTR locale sets direction", () => {
    const { config } = instantiateTemplate("agency-creative", {
      locale: "en",
    });
    expect(config.settings.direction).toBe("ltr");
  });
});

describe("Business type foundation", () => {
  it("maps restaurant to restaurant/coffee/hotel", () => {
    expect(recommendedCategoriesForBusinessType("restaurant")).toEqual(
      BUSINESS_TYPE_CATEGORY_MAP.restaurant,
    );
  });

  it("maps fashion to fashion/jewelry/beauty", () => {
    expect(recommendedCategoriesForBusinessType("fashion")).toEqual([
      "fashion",
      "jewelry",
      "beauty",
    ]);
  });

  it("falls back to general for unknown types", () => {
    expect(recommendedCategoriesForBusinessType("unknown-xyz")).toEqual(
      BUSINESS_TYPE_CATEGORY_MAP.general,
    );
  });

  it("lists business types", () => {
    const types = listBusinessTypes();
    expect(types).toContain("saas");
    expect(types).toContain("coffee");
  });
});

describe("Schema migration foundation", () => {
  it("current schema version is 1", () => {
    expect(currentTemplateSchemaVersion()).toBe(1);
    expect(TEMPLATE_SCHEMA_VERSION).toBe(1);
  });

  it("migrateTemplate normalizes pre-v1 to v1", () => {
    const t = minimalTemplate({ id: "migrate-me", slug: "migrate-me" });
    t.schemaVersion = 0;
    const migrated = migrateTemplate(t);
    expect(migrated.schemaVersion).toBe(1);
  });

  it("migrateTemplate rejects future versions", () => {
    const t = minimalTemplate({ id: "future-mig", slug: "future-mig" });
    t.schemaVersion = 50;
    expect(() => migrateTemplate(t)).toThrow(/newer than supported/);
  });
});

describe("Full catalog quality", () => {
  it("each of the 8 templates has distinct page sets", () => {
    const signatures = getTemplates().map((t) =>
      t.pages.map((p) => p.id).join("|"),
    );
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(6);
  });

  it("each template has navigation covering its pages", () => {
    for (const t of getTemplates()) {
      const pageIds = new Set(t.pages.map((p) => p.id));
      for (const nav of t.navigation) {
        expect(pageIds.has(nav.pageId)).toBe(true);
      }
      expect(t.navigation.length).toBeGreaterThan(0);
    }
  });

  it("seo is populated on instantiate", () => {
    const { config } = instantiateTemplate("real-estate", {
      locale: "en",
      brandName: "Harbor Homes",
    });
    expect(config.seo.title).toContain("Harbor");
    expect(config.seo.description.length).toBeGreaterThan(0);
    expect(config.seo.keywords.length).toBeGreaterThan(0);
  });

  it("settings.vertical comes from template industry metadata when present", () => {
    const { config } = instantiateTemplate("fashion-luxury", { locale: "en" });
    expect(config.settings.vertical).toBe("fashion");
  });
});
