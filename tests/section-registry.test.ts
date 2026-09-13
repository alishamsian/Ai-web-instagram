import { describe, expect, it, beforeEach } from "vitest";
import {
  getSectionDefinition,
  getSections,
  getSectionsByCategory,
  getSectionRenderer,
  hasSection,
  hasSectionRenderer,
  registerSectionRenderer,
  resetRegistryForTests,
} from "@/lib/store/registry";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { normalizeStoreSections } from "@/lib/store/registry/normalize";
import {
  resolveStoreBodySections,
  resolveStoreSections,
  sectionIsDimmed,
  sectionRenderKey,
  shouldRenderFooter,
  isKnownStoreSection,
} from "@/lib/store/registry/resolve";
import type { WebsiteConfig } from "@/types/website";

function configWithSections(
  sections: WebsiteConfig["sections"],
): WebsiteConfig {
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
        style: "overlay",
        headline: "Hi",
        subheadline: "",
        cta: "Shop",
      },
    },
    sections,
    seo: { title: "", description: "", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

describe("section registry", () => {
  beforeEach(() => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
  });

  it("contains expected core + commerce sections", () => {
    const types = getSections().map((d) => d.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "hero",
        "categories",
        "featured-products",
        "product-spotlight",
        "products",
        "bestsellers",
        "promo",
        "footer",
      ]),
    );
    expect(hasSection("hero")).toBe(true);
    expect(hasSection("shopByConcern")).toBe(false);
  });

  it("owns renderer bindings via registerSectionRenderer", () => {
    expect(hasSectionRenderer("hero")).toBe(false);
    registerSectionRenderer("hero", () => null);
    expect(hasSectionRenderer("hero")).toBe(true);
    expect(getSectionRenderer("hero")).toBeTypeOf("function");
    expect(getSectionDefinition("hero")?.capabilities.hide).toBe(true);
  });

  it("filters by category", () => {
    expect(
      getSectionsByCategory("commerce").some((d) => d.type === "categories"),
    ).toBe(true);
  });
});

describe("normalizeStoreSections", () => {
  it("preserves existing ids and inserts missing commerce companions", () => {
    const config = configWithSections([
      { id: "s-hero", type: "hero", visible: true },
      { id: "s-products", type: "products", visible: true },
      { id: "s-foot", type: "footer", visible: true },
    ]);
    const normalized = normalizeStoreSections(config);
    expect(normalized.map((s) => s.id)).toContain("s-hero");
    expect(normalized.map((s) => s.type)).toEqual([
      "hero",
      "categories",
      "featured-products",
      "product-spotlight",
      "products",
      "bestsellers",
      "promo",
      "footer",
    ]);
    expect(normalized.find((s) => s.type === "categories")?.id).toBe(
      "compat-categories",
    );
  });

  it("does not invent commerce extras when already explicit", () => {
    const config = configWithSections([
      { id: "h", type: "hero", visible: true },
      { id: "c", type: "categories", visible: true },
      { id: "fp", type: "featured-products", visible: true },
      { id: "ps", type: "product-spotlight", visible: true },
      { id: "p", type: "products", visible: true },
      { id: "b", type: "bestsellers", visible: true },
      { id: "pr", type: "promo", visible: true },
    ]);
    const normalized = normalizeStoreSections(config);
    expect(normalized.filter((s) => s.type === "categories")).toHaveLength(1);
    expect(normalized.map((s) => s.id)).toEqual([
      "h",
      "c",
      "fp",
      "ps",
      "p",
      "b",
      "pr",
    ]);
  });

  it("does not mutate the original config", () => {
    const config = configWithSections([
      { id: "h", type: "hero", visible: true },
      { id: "p", type: "products", visible: true },
    ]);
    const before = config.sections.length;
    normalizeStoreSections(config);
    expect(config.sections).toHaveLength(before);
  });
});

describe("store section resolve", () => {
  it("respects visibility and stable order after normalize", () => {
    const config = configWithSections([
      { id: "s-hero", type: "hero", visible: true },
      { id: "s-about", type: "about", visible: false },
      { id: "s-products", type: "products", visible: true },
      { id: "s-foot", type: "footer", visible: true },
    ]);
    const published = resolveStoreSections(config, "published");
    expect(published.some((s) => s.id === "s-about")).toBe(false);
    expect(published[0]?.id).toBe("s-hero");
    expect(sectionIsDimmed(config.sections[1]!, "editor")).toBe(true);

    const body = resolveStoreBodySections(config, "editor");
    expect(body.every((s) => sectionRenderKey(s) === s.id)).toBe(true);
    expect(body.some((s) => s.type === "footer")).toBe(false);
  });

  it("handles empty configs and unknown types safely", () => {
    const empty = resolveStoreBodySections(configWithSections([]), "published");
    expect(empty[0]?.type).toBe("hero");
    expect(isKnownStoreSection("hero")).toBe(true);
    expect(isKnownStoreSection("shopByConcern")).toBe(false);
    expect(shouldRenderFooter(configWithSections([]), "published")).toBe(true);
  });

  it("hides footer when not visible in published mode", () => {
    const config = configWithSections([
      { id: "f", type: "footer", visible: false },
    ]);
    expect(shouldRenderFooter(config, "published")).toBe(false);
    expect(shouldRenderFooter(config, "editor")).toBe(true);
  });
});
