import type { TemplateRecipe } from "@/lib/store/recipes/types";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import { hasSection } from "@/lib/store/registry/catalog";
import { templates } from "@/lib/website/templates";

export type BuildRecipeInput = {
  recipe: TemplateRecipe;
  /** Optional seed — never mutated */
  seed?: Partial<WebsiteConfig> & {
    brandName?: string;
    locale?: "fa" | "en";
  };
};

function defaultConfig(locale: "fa" | "en", brandName: string): WebsiteConfig {
  const base = templates.store;
  return {
    template: "store",
    brand: {
      name: brandName,
      colors: {
        primary: "#141414",
        secondary: "#FFFFFF",
        accent: "#3F4A3C",
        background: "#F8F7F5",
        foreground: "#141414",
        muted: "#EAE8E4",
      },
      typography: { ...base.typography },
    },
    content: {
      hero: {
        style: base.heroStyle,
        headline: brandName,
        subheadline: locale === "fa" ? "فروشگاه آنلاین" : "Online store",
        cta: locale === "fa" ? "مشاهده محصولات" : "Shop now",
      },
      products: {
        title: locale === "fa" ? "محصولات" : "Products",
        items: [],
      },
    },
    sections: [],
    seo: {
      title: brandName,
      description: brandName,
      keywords: [],
    },
    settings: {
      language: locale,
      direction: locale === "fa" ? "rtl" : "ltr",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

/**
 * Pure builder: TemplateRecipe → WebsiteConfig.
 * - Deterministic section ids
 * - Does not mutate inputs
 * - Does not save to DB
 * - Skips unknown Registry types (planned vertical sections)
 */
export function buildWebsiteConfigFromRecipe(
  input: BuildRecipeInput,
): WebsiteConfig {
  const { recipe } = input;
  const seed = input.seed ? structuredClone(input.seed) : undefined;
  const locale = seed?.locale ?? seed?.settings?.language ?? "en";
  const brandName =
    seed?.brandName ?? seed?.brand?.name ?? recipe.label.en ?? recipe.id;

  const base = defaultConfig(locale, brandName);
  const baseTemplate = recipe.baseTemplate ?? "store";
  const legacy = templates[baseTemplate] ?? templates.store;

  const sections = recipe.sections
    .filter((item) => hasSection(item.type))
    .map((item, index) => {
      const type = item.type as WebsiteSectionType;
      const id =
        item.id ??
        `${recipe.id}__${String(index).padStart(2, "0")}__${type}`;
      return {
        id,
        type,
        visible: item.visible !== false,
        ...(item.variant ? { variant: item.variant } : {}),
        ...(item.settings ? { settings: { ...item.settings } } : {}),
      };
    });

  const config: WebsiteConfig = {
    ...base,
    ...(seed
      ? {
          brand: {
            ...base.brand,
            ...seed.brand,
            name: brandName,
            colors: { ...base.brand.colors, ...seed.brand?.colors },
            typography: {
              ...legacy.typography,
              ...seed.brand?.typography,
            },
          },
          content: {
            ...base.content,
            ...seed.content,
            hero: {
              ...base.content.hero,
              ...seed.content?.hero,
              style:
                seed.content?.hero?.style ??
                legacy.heroStyle ??
                base.content.hero.style,
            },
            products: seed.content?.products ?? base.content.products,
          },
          seo: { ...base.seo, ...seed.seo },
          media: { ...base.media, ...seed.media },
        }
      : {
          brand: {
            ...base.brand,
            typography: { ...legacy.typography },
          },
          content: {
            ...base.content,
            hero: { ...base.content.hero, style: legacy.heroStyle },
          },
        }),
    template: baseTemplate,
    sections,
    settings: {
      ...base.settings,
      ...seed?.settings,
      language: locale,
      direction:
        seed?.settings?.direction ?? (locale === "fa" ? "rtl" : "ltr"),
      vertical: recipe.vertical,
      recipeId: recipe.id,
      published: false,
    },
  };

  return config;
}
