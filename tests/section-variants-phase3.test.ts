import { describe, expect, it, beforeEach } from "vitest";
import {
  getDefaultVariant,
  getVariantRendererKey,
  getVariantsForSection,
  isVariantSupported,
  resolveSectionRenderer,
  resolveSectionVariant,
  registerSectionRenderer,
  resetRegistryForTests,
  validateSectionVariantCatalog,
  ALL_SECTION_DEFINITIONS,
} from "@/lib/store/registry";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { ensureVariantRenderersBound } from "@/components/store/variants/bind-variant-renderers";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import {
  commandSetSectionVariant,
  commandAddSection,
} from "@/lib/editor/commands";
import { applyVisualPreset } from "@/lib/design-system/visual-presets";
import type { WebsiteConfig } from "@/types/website";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Demo",
      colors: {
        primary: "#111",
        secondary: "#fff",
        accent: "#333",
        background: "#fff",
        foreground: "#111",
        muted: "#eee",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
    },
    content: {
      hero: {
        style: "fan",
        headline: "Hello",
        subheadline: "Sub",
        cta: "Shop",
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true, variant: "fan" },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "", description: "", keywords: [] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

const PREMIUM_TYPES = [
  "hero",
  "products",
  "featured-products",
  "about",
  "gallery",
  "cta",
  "bestsellers",
  "trust",
] as const;

describe("phase 3 — premium visual library", () => {
  beforeEach(() => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
    ensureStoreSectionRenderersBound();
    ensureVariantRenderersBound();
  });

  it("catalog validation passes with premium variants", () => {
    expect(validateSectionVariantCatalog().ok).toBe(true);
  });

  it("every premium section has one default and complete contracts", () => {
    for (const type of PREMIUM_TYPES) {
      const variants = getVariantsForSection(type);
      expect(variants.length).toBeGreaterThanOrEqual(2);
      expect(variants.filter((v) => v.default).length).toBe(1);
      for (const variant of variants) {
        expect(variant.signature?.composition).toBeTruthy();
        expect(variant.responsive?.mobile).toBeTruthy();
        expect(variant.responsive?.tablet).toBeTruthy();
        expect(variant.responsive?.desktop).toBeTruthy();
        expect(variant.theme?.semanticTokens).toBe(true);
        expect(variant.theme?.light || variant.theme?.dark).toBe(true);
        expect(variant.capabilities?.supportsRTL).toBe(true);
        expect(getVariantRendererKey(type, variant.id)).toBe(
          `${type}.${variant.id}`,
        );
      }
    }
  });

  it("resolves implemented variant renderers and falls back safely", () => {
    expect(resolveSectionRenderer("hero", "editorial")).toBeTypeOf("function");
    expect(resolveSectionRenderer("gallery", "masonry")).toBeTypeOf("function");
    expect(resolveSectionRenderer("about", "image-led")).toBeTypeOf("function");
    expect(resolveSectionRenderer("cta", "minimal")).toBeTypeOf("function");
    expect(resolveSectionRenderer("trust", "quotes")).toBeTypeOf("function");

    registerSectionRenderer("products", () => "products-fallback" as never);
    expect(resolveSectionRenderer("products", "ghost")).toBeTypeOf("function");
    expect(resolveSectionVariant("hero", "ancient").id).toBe("fan");
    expect(resolveSectionVariant("hero", "menu").id).toBe("editorial");
  });

  it("variant commands preserve content, id, and type", () => {
    const before = baseConfig();
    const next = commandSetSectionVariant(before, "hero-1", "overlay");
    expect(next?.config.sections[0]).toMatchObject({
      id: "hero-1",
      type: "hero",
      variant: "overlay",
    });
    expect(next?.config.content.hero.headline).toBe("Hello");
    expect(commandSetSectionVariant(before, "hero-1", "nope")).toBeNull();
  });

  it("insert with premium variant works without fake content", () => {
    const added = commandAddSection(baseConfig(), "gallery", {
      variant: "collage",
    });
    const gallery = added?.config.sections.find((s) => s.type === "gallery");
    expect(gallery?.variant).toBe("collage");
    expect(added?.config.content.gallery?.imageIds ?? []).toEqual([]);
  });

  it("preset recommendations stay registry-backed and non-mutating", () => {
    expect(isVariantSupported("gallery", "masonry")).toBe(true);
    expect(isVariantSupported("products", "rail")).toBe(true);
    const before = baseConfig();
    const after = applyVisualPreset(before, "mono-gallery");
    expect(after.sections).toEqual(before.sections);
    expect(getDefaultVariant("trust")?.id).toBe("metrics");
  });

  it("full registry still validates", () => {
    resetRegistryForTests(ALL_SECTION_DEFINITIONS);
    expect(validateSectionVariantCatalog().ok).toBe(true);
  });
});
