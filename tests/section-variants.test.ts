import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  areVariantsVisuallyDistinct,
  getDefaultVariant,
  getRecommendedVariants,
  getVariant,
  getVariantRendererKey,
  getVariantsForSection,
  isVariantSupported,
  normalizeSectionVariant,
  normalizeSectionVariants,
  resolveSectionRenderer,
  resolveSectionVariant,
  registerSectionRenderer,
  registerVariantRenderer,
  resetRegistryForTests,
  validateSectionVariantCatalog,
  ALL_SECTION_DEFINITIONS,
} from "@/lib/store/registry";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import {
  commandAddSection,
  commandSetSectionVariant,
  defaultVariantForType,
} from "@/lib/editor/commands";
import { normalizeEditorConfig } from "@/lib/editor/normalize-content";
import { applyVisualPreset } from "@/lib/design-system/visual-presets";

function baseConfig(overrides?: Partial<WebsiteConfig>): WebsiteConfig {
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
      { id: "products-1", type: "products", visible: true, variant: "classic" },
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
    ...overrides,
  };
}

describe("section variant architecture", () => {
  beforeEach(() => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
  });

  it("validates the catalog deterministically", () => {
    const first = validateSectionVariantCatalog();
    const second = validateSectionVariantCatalog();
    expect(first.ok).toBe(true);
    expect(first.errors).toEqual([]);
    expect(second).toEqual(first);
  });

  it("keeps unique variant ids per section and composite keys", () => {
    const report = validateSectionVariantCatalog();
    expect(report.errors.filter((e) => e.startsWith("duplicate"))).toEqual([]);
  });

  it("requires defaults, responsive, theme, and signatures", () => {
    for (const type of [
      "hero",
      "products",
      "featured-products",
      "bestsellers",
      "about",
      "gallery",
      "cta",
    ] as const) {
      const def = getDefaultVariant(type);
      expect(def?.id).toBeTruthy();
      expect(def?.responsive?.mobile).toBeTruthy();
      expect(def?.responsive?.tablet).toBeTruthy();
      expect(def?.responsive?.desktop).toBeTruthy();
      expect(def?.theme?.light || def?.theme?.dark).toBe(true);
      expect(def?.theme?.semanticTokens).toBe(true);
      expect(def?.signature?.composition).toBeTruthy();
      expect(def?.capabilities?.supportsRTL).toBe(true);
    }
  });

  it("lookup helpers share one registry", () => {
    expect(getVariant("hero", "split")?.id).toBe("split");
    expect(getVariantsForSection("hero").map((v) => v.id)).toContain("fan");
    expect(getDefaultVariant("hero")?.id).toBe("fan");
    expect(isVariantSupported("hero", "menu")).toBe(true);
    expect(isVariantSupported("hero", "nope")).toBe(false);
    expect(getVariantRendererKey("hero", "editorial")).toBe("hero.editorial");
  });

  it("resolves exact, alias, default, and unknown fallback without mutating", () => {
    expect(resolveSectionVariant("hero", "split").source).toBe("exact");
    expect(resolveSectionVariant("hero", "menu")).toMatchObject({
      id: "editorial",
      source: "alias",
    });
    expect(resolveSectionVariant("hero", null).source).toBe("default");
    expect(resolveSectionVariant("hero", "ancient-unknown")).toMatchObject({
      id: "fan",
      source: "fallback",
    });
  });

  it("marks near-duplicates via visual signature", () => {
    const a = getVariant("hero", "fan")!;
    const b = getVariant("hero", "overlay")!;
    expect(areVariantsVisuallyDistinct(a, b)).toBe(true);
    const clone = {
      ...a,
      id: "clone",
      signature: { ...a.signature!, media: "almost-same" },
    };
    expect(areVariantsVisuallyDistinct(a, clone)).toBe(false);
  });

  it("normalizes missing/legacy/unknown variants idempotently and preserves content", () => {
    const raw = baseConfig({
      content: {
        hero: {
          style: "menu" as never,
          headline: "Keep me",
          subheadline: "Also keep",
          cta: "Buy",
        },
        products: {
          title: "Products",
          items: [
            {
              id: "p1",
              name: "Item",
              description: "",
              category: "general",
              price: 10,
              currency: "USD",
              imageIds: [],
              confidence: 1,
            },
          ],
        },
      },
      sections: [
        { id: "hero-1", type: "hero", visible: true, variant: "menu" },
        {
          id: "products-1",
          type: "products",
          visible: true,
          variant: "ghost-variant",
        },
        { id: "gallery-1", type: "gallery", visible: true },
      ],
    });

    const once = normalizeSectionVariants(raw);
    const twice = normalizeSectionVariants(once);
    expect(twice).toEqual(once);
    expect(once.sections.find((s) => s.id === "hero-1")?.variant).toBe(
      "editorial",
    );
    expect(once.sections.find((s) => s.id === "products-1")?.variant).toBe(
      "classic",
    );
    expect(once.sections.find((s) => s.id === "gallery-1")?.variant).toBe(
      "lookbook",
    );
    expect(once.content.hero.headline).toBe("Keep me");
    expect(once.content.products?.items?.[0]?.id).toBe("p1");
    expect(once.sections[0]?.id).toBe("hero-1");

    expect(normalizeSectionVariant(raw.sections[0]!).variant).toBe("editorial");
  });

  it("setSectionVariant changes only variant and preserves ids/content/type", () => {
    const before = baseConfig();
    const ok = commandSetSectionVariant(before, "hero-1", "split");
    expect(ok?.config.sections[0]).toMatchObject({
      id: "hero-1",
      type: "hero",
      variant: "split",
    });
    expect(ok?.config.content.hero.headline).toBe("Hello");
    expect(ok?.config.content.hero.style).toBe("split");

    expect(commandSetSectionVariant(before, "hero-1", "nope")).toBeNull();
    expect(commandSetSectionVariant(before, "missing", "split")).toBeNull();
    expect(
      commandSetSectionVariant(before, "products-1", "split"),
    ).toBeNull();
  });

  it("insert with valid variant works; invalid is rejected; no fake content", () => {
    const withoutGallery = baseConfig({
      sections: [
        { id: "hero-1", type: "hero", visible: true, variant: "fan" },
        { id: "footer-1", type: "footer", visible: true },
      ],
    });
    const added = commandAddSection(withoutGallery, "gallery", {
      variant: "grid",
    });
    expect(added?.config.sections.some((s) => s.type === "gallery")).toBe(true);
    const gallery = added?.config.sections.find((s) => s.type === "gallery");
    expect(gallery?.variant).toBe("grid");
    expect(added?.config.content.gallery?.imageIds ?? []).toEqual([]);

    expect(
      commandAddSection(withoutGallery, "gallery", { variant: "not-real" }),
    ).toBeNull();
    expect(defaultVariantForType("gallery")).toBe("lookbook");
  });

  it("preset recommendations are registry-backed and do not mutate sections", () => {
    const recs = getRecommendedVariants("hero", "quiet-luxury");
    expect(recs.map((v) => v.id)).toContain("editorial");
    const before = baseConfig();
    const after = applyVisualPreset(before, "quiet-luxury");
    expect(after.sections).toEqual(before.sections);
    expect(after.content).toEqual(before.content);
    expect(after.settings.mood).toBe("quiet-luxury");
  });

  it("variant renderer falls back to section renderer", () => {
    const sectionRenderer = () => "section" as never;
    const variantRenderer = () => "variant" as never;
    registerSectionRenderer("hero", sectionRenderer);
    expect(resolveSectionRenderer("hero", "unknown-variant")).toBe(
      sectionRenderer,
    );
    registerVariantRenderer("hero.editorial", variantRenderer);
    expect(resolveSectionRenderer("hero", "editorial")).toBe(variantRenderer);
    expect(resolveSectionRenderer("hero", "menu")).toBe(variantRenderer);
  });

  it("editor normalize remains backwards compatible for configs without variant", () => {
    const legacy = baseConfig({
      sections: [
        { id: "hero-1", type: "hero", visible: true },
        { id: "footer-1", type: "footer", visible: true },
      ],
    });
    const next = normalizeEditorConfig(legacy);
    expect(next.sections.find((s) => s.type === "hero")?.variant).toBe("fan");
    expect(next.content.hero.headline).toBe("Hello");
  });

  it("full registry seed still validates", () => {
    resetRegistryForTests(ALL_SECTION_DEFINITIONS);
    expect(validateSectionVariantCatalog().ok).toBe(true);
  });
});
