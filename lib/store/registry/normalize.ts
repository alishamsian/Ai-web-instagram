import type { SectionConfig, WebsiteConfig, WebsiteSectionType } from "@/types/website";

/**
 * Pure compatibility layer — does not mutate input or persist to DB.
 * Expands legacy Store configs that relied on implicit commerce extras.
 */

const AFTER_HERO: WebsiteSectionType[] = [
  "categories",
  "featured-products",
  "product-spotlight",
];

function hasType(sections: SectionConfig[], type: WebsiteSectionType) {
  return sections.some((s) => s.type === type);
}

function compatId(type: WebsiteSectionType) {
  return `compat-${type}`;
}

function insertAfter(
  list: SectionConfig[],
  anchorType: WebsiteSectionType,
  extras: SectionConfig[],
): SectionConfig[] {
  if (extras.length === 0) return list;
  const idx = list.findIndex((s) => s.type === anchorType);
  if (idx < 0) return [...extras, ...list];
  return [...list.slice(0, idx + 1), ...extras, ...list.slice(idx + 1)];
}

function makeSection(
  type: WebsiteSectionType,
  settings?: Record<string, unknown>,
): SectionConfig {
  return {
    id: compatId(type),
    type,
    visible: true,
    settings,
  };
}

/**
 * Returns a canonical section list for Store rendering.
 * Existing IDs/order/visibility/settings are preserved.
 * Recipe-driven configs (settings.recipeId) are NOT expanded —
 * composition already came from TemplateRecipe + data-aware filtering.
 * Legacy configs without recipeId still get deterministic commerce extras.
 */
export function normalizeStoreSections(
  config: WebsiteConfig,
): SectionConfig[] {
  const source =
    config.sections.length > 0
      ? config.sections.map((s) => ({ ...s }))
      : ([
          "hero",
          "products",
          "about",
          "gallery",
          "faq",
          "contact",
          "footer",
        ] as WebsiteSectionType[]).map((type) => ({
          id: `fallback-${type}`,
          type,
          visible: true,
        }));

  // P4/P5 recipe composition is authoritative — do not inject extras.
  if (config.settings.recipeId) {
    return source;
  }

  let next = source;

  if (hasType(next, "hero")) {
    const missingAfterHero = AFTER_HERO.filter((type) => !hasType(next, type)).map(
      (type) =>
        makeSection(
          type,
          type === "featured-products" || type === "product-spotlight"
            ? { productSource: "featured" }
            : undefined,
        ),
    );
    next = insertAfter(next, "hero", missingAfterHero);
  }

  if (hasType(next, "products")) {
    if (!hasType(next, "bestsellers")) {
      next = insertAfter(next, "products", [
        makeSection("bestsellers", { productSource: "bestsellers" }),
      ]);
    }

    if (!hasType(next, "cta") && !hasType(next, "promo")) {
      const anchor = hasType(next, "bestsellers") ? "bestsellers" : "products";
      next = insertAfter(next, anchor, [makeSection("promo")]);
    }
  }

  return next;
}
