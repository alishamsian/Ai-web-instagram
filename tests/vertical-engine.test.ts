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
  buildWebsiteConfigFromUnderstanding,
  filterProductsByAttribute,
  resolveVerticalFilters,
  CORE_VERTICAL_PACKS,
} from "@/lib/store/verticals";
import {
  buildWebsiteConfigFromRecipe,
  getRecipe,
  getRecipesForVertical,
  resetRecipeRegistryForTests,
  resolveRecipe,
  templateDefinitionToRecipe,
  CORE_TEMPLATE_RECIPES,
} from "@/lib/store/recipes";
import { templates } from "@/lib/website/templates";
import {
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
  hasSection,
  getSectionDefinition,
} from "@/lib/store/registry";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
import { inferStoreMood } from "@/lib/store/theme";
import type { Product } from "@/types/ai";
import { normalizeStoreSections } from "@/lib/store/registry/normalize";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import { getSectionRenderer } from "@/lib/store/registry/catalog";

beforeEach(() => {
  resetRegistryForTests(ALL_SECTION_DEFINITIONS);
  resetVerticalRegistryForTests([...CORE_VERTICAL_PACKS]);
  resetRecipeRegistryForTests([...CORE_TEMPLATE_RECIPES]);
  ensureStoreSectionRenderersBound();
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
  it("beauty / fashion / coffee include vertical-specific registered sections", () => {
    expect(hasSection("shop-by-concern")).toBe(true);
    expect(hasSection("lookbook")).toBe(true);
    expect(hasSection("origin-explorer")).toBe(true);
    expect(getSectionDefinition("shop-by-concern")?.verticals).toContain(
      "beauty",
    );

    for (const id of ["beauty", "fashion", "coffee"] as const) {
      const recommended = getRecommendedSectionsForVertical(id);
      const supported = getSectionsForVertical(id).map((s) => s.type);
      expect(recommended.length).toBeGreaterThan(0);
      for (const type of recommended) {
        expect(supported).toContain(type);
        expect(hasSection(type)).toBe(true);
      }
      expect(isSectionSupportedByVertical("hero", id)).toBe(true);
    }

    expect(isSectionSupportedByVertical("shop-by-concern", "beauty")).toBe(
      true,
    );
    expect(isSectionSupportedByVertical("shop-by-concern", "fashion")).toBe(
      false,
    );
  });

  it("supported != recommended", () => {
    const supported = getSectionsForVertical("beauty").map((s) => s.type);
    const recommended = getRecommendedSectionsForVertical("beauty");
    expect(supported.length).toBeGreaterThan(recommended.length);
  });

  it("resolves renderers for vertical sections", () => {
    expect(getSectionRenderer("routine")).toBeTypeOf("function");
    expect(getSectionRenderer("brew-guide")).toBeTypeOf("function");
    expect(getSectionRenderer("lookbook")).toBeTypeOf("function");
  });
});

describe("product attributes + filters", () => {
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
      industryData: {
        vertical: "beauty",
        attributes: { concerns: ["acne"], skinType: ["oily"] },
      },
    };
    const before = structuredClone(product);
    const filtered = filterProductsByAttribute([product], "concerns", "acne");
    expect(filtered).toHaveLength(1);
    expect(product).toEqual(before);

    const filters = resolveVerticalFilters("beauty", [product]);
    expect(filters.some((f) => f.attribute === "concerns")).toBe(true);
    expect(filters.find((f) => f.attribute === "concerns")?.options).toContain(
      "acne",
    );
  });

  it("missing attributes do not crash filters", () => {
    const product: Product = {
      name: "Plain",
      description: "",
      category: "",
      price: null,
      currency: null,
      imageIds: [],
      confidence: 1,
    };
    expect(filterProductsByAttribute([product], "origin", "ethiopia")).toEqual(
      [],
    );
    const filters = resolveVerticalFilters("coffee", [product]);
    expect(filters.length).toBeGreaterThan(0);
    expect(
      filters.find((f) => f.attribute === "roastLevel")?.options.length,
    ).toBeGreaterThan(0);
  });
});

describe("template recipes", () => {
  it("beauty recipe includes vertical sections and builds immutably", () => {
    const recipe = getRecipe("beauty-editorial");
    expect(recipe?.sections.some((s) => s.type === "shop-by-concern")).toBe(
      true,
    );
    expect(recipe?.sections.some((s) => s.type === "routine")).toBe(true);

    const input = {
      recipe: recipe!,
      seed: { brandName: "Glow", locale: "en" as const },
    };
    const before = structuredClone(input);
    const config = buildWebsiteConfigFromRecipe(input);
    expect(input).toEqual(before);
    expect(config.settings.vertical).toBe("beauty");
    expect(config.settings.recipeId).toBe("beauty-editorial");
    expect(config.sections.map((s) => s.type)).toEqual(
      expect.arrayContaining([
        "shop-by-concern",
        "routine",
        "ingredient-story",
        "product-finder",
      ]),
    );
    expect(config.sections.map((s) => s.id)).toEqual(
      buildWebsiteConfigFromRecipe(input).sections.map((s) => s.id),
    );
  });

  it("unknown recipe falls back to generic-store", () => {
    const recipe = resolveRecipe("does-not-exist");
    expect(recipe.id).toBe("generic-store");
    const config = buildWebsiteConfigFromRecipe({ recipeId: "missing" });
    expect(config.settings.recipeId).toBe("generic-store");
    expect(config.settings.vertical).toBe("generic");
  });

  it("coffee and fashion recipes produce vertical compositions", () => {
    const coffee = buildWebsiteConfigFromRecipe({
      recipe: getRecipe("coffee-story")!,
      seed: { brandName: "Roast", locale: "fa" },
    });
    expect(coffee.sections.map((s) => s.type)).toEqual(
      expect.arrayContaining([
        "origin-explorer",
        "brew-guide",
        "subscription",
      ]),
    );

    const fashion = buildWebsiteConfigFromRecipe({
      recipe: getRecipe("fashion-editorial")!,
    });
    expect(fashion.sections.map((s) => s.type)).toEqual(
      expect.arrayContaining(["lookbook", "shop-the-look", "collection-story"]),
    );
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
    expect(typeof inferStoreMood(config)).toBe("string");
  });
});

describe("confidence + strategy + pipeline", () => {
  it("low confidence falls back", () => {
    const picked = pickVerticalWithConfidence({
      vertical: "beauty",
      fallbackVertical: "generic",
      confidence: 0.2,
    });
    expect(picked.vertical).toBe("generic");
    expect(picked.uncertain).toBe(true);
  });

  it("BusinessUnderstanding → Vertical → Recipe → WebsiteConfig", () => {
    const { strategy, config } = buildWebsiteConfigFromUnderstanding({
      understanding: {
        vertical: "coffee",
        confidence: 0.92,
        recommendedTemplate: "coffee-story",
      },
      seed: { brandName: "Bean Co", locale: "en" },
    });
    expect(strategy.vertical).toBe("coffee");
    expect(strategy.template).toBe("coffee-story");
    expect(config.settings.vertical).toBe("coffee");
    expect(config.settings.recipeId).toBe("coffee-story");
    expect(config.sections.every((s) => hasSection(s.type))).toBe(true);
    expect(getSectionRenderer(config.sections[0]!.type)).toBeTypeOf("function");
  });
});

describe("editor library seam", () => {
  it("library surfaces beauty sections as recommended", () => {
    const items = getSectionLibraryItems({ vertical: "beauty" });
    expect(items.some((i) => i.type === "shop-by-concern")).toBe(true);
    expect(items.find((i) => i.type === "shop-by-concern")?.recommended).toBe(
      true,
    );
    expect(items.some((i) => i.type === "lookbook")).toBe(false);
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
