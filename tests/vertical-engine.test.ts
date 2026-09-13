import { describe, expect, it, beforeEach } from "vitest";
import {
  registerVertical,
  getVertical,
  hasVertical,
  getVerticals,
  resetVerticalRegistryForTests,
  getSectionsForVertical,
  getRecommendedSectionsForVertical,
  isSectionSupportedByVertical,
  getProductAttributesForVertical,
  pickVerticalWithConfidence,
  resolveBusinessStrategy,
} from "@/lib/store/verticals";
import { CORE_VERTICAL_PACKS } from "@/lib/store/verticals/packs";
import {
  buildWebsiteConfigFromRecipe,
  getRecipe,
  getRecipesForVertical,
  resetRecipeRegistryForTests,
  templateDefinitionToRecipe,
  CORE_TEMPLATE_RECIPES,
} from "@/lib/store/recipes";
import { templates } from "@/lib/website/templates";
import { resetRegistryForTests } from "@/lib/store/registry/catalog";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
import { inferStoreMood } from "@/lib/store/theme";
import type { Product } from "@/types/ai";
import { normalizeStoreSections } from "@/lib/store/registry/normalize";

beforeEach(() => {
  resetRegistryForTests(CORE_SECTION_DEFINITIONS);
  resetVerticalRegistryForTests([...CORE_VERTICAL_PACKS]);
  resetRecipeRegistryForTests([...CORE_TEMPLATE_RECIPES]);
});

describe("vertical registry", () => {
  it("registers and resolves verticals", () => {
    expect(hasVertical("beauty")).toBe(true);
    expect(getVertical("beauty")?.label.en).toBe("Beauty");
    expect(getVerticals().length).toBeGreaterThanOrEqual(6);
  });

  it("rejects duplicate vertical", () => {
    const result = registerVertical({
      id: "beauty",
      label: { fa: "x", en: "x" },
      description: { fa: "x", en: "x" },
    });
    expect(result.ok).toBe(false);
  });

  it("handles unknown vertical via generic", () => {
    expect(hasVertical("spaceships")).toBe(false);
    const sections = getSectionsForVertical("spaceships");
    expect(sections.some((s) => s.type === "hero")).toBe(true);
    expect(getRecommendedSectionsForVertical(null).length).toBeGreaterThan(0);
  });
});

describe("vertical section compatibility", () => {
  it("beauty / fashion / coffee get recommended core sections", () => {
    for (const id of ["beauty", "fashion", "coffee"] as const) {
      const recommended = getRecommendedSectionsForVertical(id);
      const supported = getSectionsForVertical(id).map((s) => s.type);
      expect(recommended.length).toBeGreaterThan(0);
      for (const type of recommended) {
        expect(supported).toContain(type);
      }
      expect(isSectionSupportedByVertical("hero", id)).toBe(true);
      expect(isSectionSupportedByVertical("products", id)).toBe(true);
    }
  });

  it("supported != recommended", () => {
    const supported = getSectionsForVertical("beauty").map((s) => s.type);
    const recommended = getRecommendedSectionsForVertical("beauty");
    expect(supported.length).toBeGreaterThan(recommended.length);
  });

  it("generic sections remain available for unknown vertical", () => {
    expect(isSectionSupportedByVertical("gallery", "unknown-xyz")).toBe(true);
  });
});

describe("product attributes", () => {
  it("vertical exposes attribute definitions without mutating products", () => {
    const attrs = getProductAttributesForVertical("beauty", "skincare");
    expect(attrs.some((a) => a.key === "skinType")).toBe(true);
    expect(attrs.some((a) => a.key === "finish")).toBe(false);

    const product: Product = {
      name: "Serum",
      description: "",
      category: "skincare",
      price: null,
      currency: null,
      imageIds: [],
      confidence: 0.9,
    };
    const before = structuredClone(product);
    void getProductAttributesForVertical("beauty");
    expect(product).toEqual(before);
    expect(product.industryData).toBeUndefined();

    const withIndustry: Product = {
      ...product,
      industryData: {
        vertical: "beauty",
        attributes: { skinType: ["oily"] },
      },
    };
    expect(withIndustry.name).toBe("Serum");
    expect(withIndustry.industryData?.attributes?.skinType).toEqual(["oily"]);
  });
});

describe("template recipes", () => {
  it("recipe resolves through registry and builds WebsiteConfig", () => {
    const recipe = getRecipe("beauty-editorial");
    expect(recipe).toBeTruthy();
    const input = {
      recipe: recipe!,
      seed: { brandName: "Glow", locale: "en" as const },
    };
    const before = structuredClone(input);
    const config = buildWebsiteConfigFromRecipe(input);
    expect(input).toEqual(before);
    expect(config.settings.vertical).toBe("beauty");
    expect(config.settings.recipeId).toBe("beauty-editorial");
    expect(
      config.sections.every((s) => s.id.includes("beauty-editorial")),
    ).toBe(true);
    expect(config.sections[0]?.type).toBe("hero");
    expect(config.sections.map((s) => s.id)).toEqual(
      buildWebsiteConfigFromRecipe(input).sections.map((s) => s.id),
    );
  });

  it("coffee and fashion recipes produce valid configs", () => {
    for (const id of ["coffee-story", "fashion-editorial"] as const) {
      const recipe = getRecipe(id)!;
      const config = buildWebsiteConfigFromRecipe({
        recipe,
        seed: { brandName: "Demo", locale: "fa" },
      });
      expect(config.sections.length).toBeGreaterThan(3);
      expect(config.settings.language).toBe("fa");
      expect(config.settings.direction).toBe("rtl");
    }
  });

  it("legacy templates remain compatible via adapter", () => {
    const recipe = templateDefinitionToRecipe(templates.store);
    expect(recipe.id).toBe("legacy-store");
    const config = buildWebsiteConfigFromRecipe({ recipe });
    expect(config.template).toBe("store");
    expect(config.sections.some((s) => s.type === "products")).toBe(true);
  });
});

describe("theme separation", () => {
  it("vertical does not own theme; recipe mood is independent of inferStoreMood", () => {
    const recipe = getRecipe("beauty-editorial")!;
    expect(recipe.mood).toBe("natural");
    expect(getVertical("beauty")).not.toHaveProperty("mood");
    const config = buildWebsiteConfigFromRecipe({
      recipe,
      seed: { brandName: "Glow" },
    });
    const mood = inferStoreMood(config);
    expect(typeof mood).toBe("string");
  });
});

describe("confidence + strategy", () => {
  it("low confidence falls back", () => {
    const picked = pickVerticalWithConfidence({
      vertical: "beauty",
      fallbackVertical: "generic",
      confidence: 0.2,
    });
    expect(picked.vertical).toBe("generic");
    expect(picked.uncertain).toBe(true);

    const strategy = resolveBusinessStrategy({
      vertical: "coffee",
      confidence: 0.9,
      recommendedTemplate: "coffee-story",
    });
    expect(strategy.vertical).toBe("coffee");
    expect(strategy.template).toBe("coffee-story");
    expect(strategy.uncertain).toBe(false);
  });
});

describe("editor library seam", () => {
  it("library can filter by vertical and mark recommended", () => {
    const items = getSectionLibraryItems({ vertical: "beauty" });
    expect(items.some((i) => i.type === "hero")).toBe(true);
    expect(items.some((i) => i.recommended)).toBe(true);
  });
});

describe("compatibility", () => {
  it("legacy WebsiteConfig normalization remains non-mutating", () => {
    const config = buildWebsiteConfigFromRecipe({
      recipe: getRecipe("generic-store")!,
    });
    const before = structuredClone(config.sections);
    normalizeStoreSections(config);
    expect(config.sections).toEqual(before);
  });

  it("registering a sixth vertical does not require StoreRenderer changes", () => {
    const result = registerVertical({
      id: "pet",
      label: { fa: "پت", en: "Pet" },
      description: { fa: "حیوانات خانگی", en: "Pet" },
      recommendedSections: ["hero", "products", "gallery"],
      templates: [],
    });
    expect(result.ok).toBe(true);
    expect(getRecipesForVertical("pet")).toEqual([]);
    expect(isSectionSupportedByVertical("hero", "pet")).toBe(true);
  });
});
