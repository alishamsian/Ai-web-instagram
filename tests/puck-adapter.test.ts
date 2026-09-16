/**
 * Phase 1 — Puck adapter round-trip & config coverage tests.
 * Does not delete or replace the classic editor.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  websiteConfigToPuck,
  puckToWebsiteConfig,
  assertRoundTrip,
  websiteConfigsEqualForAdapter,
  listUnregisteredSectionTypes,
  buildPuckConfig,
} from "@/lib/puck";
import {
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
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

function richConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "نور",
      tagline: "زیبایی آرام",
      logo: "logo-1",
      colors: {
        primary: "#111111",
        secondary: "#FFFFFF",
        accent: "#C9A227",
        background: "#FAFAF7",
        foreground: "#111111",
        muted: "#EFEFEA",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
      design: {
        contentWidth: "wide",
        sectionSpacing: "spacious",
        radius: "soft",
        shadow: "subtle",
      },
    },
    content: {
      hero: {
        style: "overlay",
        headline: "نور برای پوست",
        subheadline: "مراقبت روزانه",
        cta: "خرید",
        ctaHref: "#products",
        imageId: "hero-img",
      },
      about: {
        title: "درباره ما",
        body: "متن فارسی با English mixed.",
        imageId: "about-img",
      },
      products: {
        title: "محصولات",
        items: [
          {
            name: "سرم",
            description: "روزانه",
            category: "care",
            price: null,
            currency: null,
            imageIds: ["p1"],
            confidence: 0.9,
          },
        ],
        defaults: { category: "care", currency: "IRT" },
      },
      services: {
        title: "خدمات",
        items: [
          {
            name: "مشاوره",
            description: "۳۰ دقیقه",
            imageIds: [],
            confidence: 0.8,
          },
        ],
      },
      gallery: { title: "گالری", imageIds: ["g1", "g2"] },
      testimonials: {
        title: "نظرات",
        items: [{ id: "t1", quote: "عالی", author: "سارا" }],
      },
      faq: {
        title: "سوالات",
        items: [{ id: "f1", question: "ارسال؟", answer: "بله" }],
      },
      contact: {
        title: "تماس",
        body: "سلام",
        info: {
          phone: "09000000000",
          email: "a@b.c",
          website: null,
          instagram: null,
          telegram: null,
          whatsapp: null,
          address: "تهران",
          location: null,
        },
      },
      promo: { kicker: "جدید", title: "تخفیف", cta: "ببین", ctaHref: "#" },
      trust: { items: ["اصالت", "ارسال سریع"] },
    },
    sections: [
      {
        id: "hero-1",
        type: "hero",
        visible: true,
        variant: "editorial",
        settings: { spacing: "comfortable", columns: 2 },
      },
      { id: "about-1", type: "about", visible: true },
      {
        id: "products-1",
        type: "products",
        visible: true,
        settings: { productSource: "all" },
      },
      { id: "gallery-1", type: "gallery", visible: false },
      {
        id: "lookbook-1",
        type: "lookbook",
        visible: true,
        variant: "grid",
      },
      { id: "faq-1", type: "faq", visible: true },
      { id: "contact-1", type: "contact", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: {
      title: "نور",
      description: "فروشگاه نور",
      keywords: ["زیبایی", "beauty"],
    },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
      vertical: "beauty",
      recipeId: "beauty-calm",
      mood: "calm",
      themeMode: "light",
    },
    media: {
      "hero-img": {
        url: "https://example.com/hero.jpg",
        alt: "hero",
        type: "image",
      },
      "about-img": {
        url: "https://example.com/about.jpg",
        alt: "about",
        type: "image",
      },
      p1: { url: "https://example.com/p1.jpg", alt: "p1", type: "image" },
      g1: { url: "https://example.com/g1.jpg", alt: "g1", type: "image" },
      g2: { url: "https://example.com/g2.jpg", alt: "g2", type: "image" },
    },
  };
}

describe("Puck adapter — round trip", () => {
  it("preserves all important WebsiteConfig fields", () => {
    const original = richConfig();
    const { diff, config: restored } = assertRoundTrip(original);
    expect(diff.messages).toEqual([]);
    expect(diff.ok).toBe(true);
    expect(websiteConfigsEqualForAdapter(original, restored)).toBe(true);
  });

  it("preserves section ids, order, visibility, variants, settings", () => {
    const original = richConfig();
    const puck = websiteConfigToPuck(original);
    expect(puck.content).toHaveLength(original.sections.length);
    expect(puck.content[0]?.props.id).toBe("hero-1");
    expect(puck.content[3]?.props.visible).toBe(false);

    const restored = puckToWebsiteConfig(puck, original);
    expect(restored.sections.map((s) => s.id)).toEqual(
      original.sections.map((s) => s.id),
    );
    expect(restored.sections[0]?.variant).toBe("editorial");
    expect(restored.sections[0]?.settings).toEqual({
      spacing: "comfortable",
      columns: 2,
    });
    expect(restored.sections[3]?.visible).toBe(false);
  });

  it("preserves RTL / Persian site settings and media", () => {
    const original = richConfig();
    const restored = puckToWebsiteConfig(
      websiteConfigToPuck(original),
      original,
    );
    expect(restored.settings.direction).toBe("rtl");
    expect(restored.settings.language).toBe("fa");
    expect(restored.brand.name).toBe("نور");
    expect(restored.content.hero.headline).toBe("نور برای پوست");
    expect(Object.keys(restored.media)).toEqual(
      expect.arrayContaining(["hero-img", "p1", "g1"]),
    );
  });

  it("pins footer last when Puck order drifts", () => {
    const original = richConfig();
    const puck = websiteConfigToPuck(original);
    // Move footer to the front (simulating bad DnD)
    const footer = puck.content.find((c) => c.type === "footer");
    const rest = puck.content.filter((c) => c.type !== "footer");
    expect(footer).toBeTruthy();
    puck.content = [footer!, ...rest];
    const restored = puckToWebsiteConfig(puck, original);
    expect(restored.sections.at(-1)?.type).toBe("footer");
  });

  it("does not drop vertical section types", () => {
    const original = richConfig();
    const restored = puckToWebsiteConfig(
      websiteConfigToPuck(original),
      original,
    );
    expect(restored.sections.some((s) => s.type === "lookbook")).toBe(true);
  });
});

describe("Puck config from registry", () => {
  it("registers every known section definition as a component", () => {
    const config = buildPuckConfig({ locale: "en" });
    for (const def of ALL_SECTION_DEFINITIONS) {
      expect(config.components[def.type]).toBeTruthy();
    }
  });

  it("exposes category groupings from SECTION_CATEGORIES", () => {
    const config = buildPuckConfig({ locale: "fa" });
    expect(config.categories).toBeTruthy();
    expect(Object.keys(config.categories ?? {}).length).toBeGreaterThan(0);
    expect(config.categories?.featured?.title).toBeTruthy();
  });

  it("reports no unregistered types for rich fixture", () => {
    expect(listUnregisteredSectionTypes(richConfig())).toEqual([]);
  });
});
