import type { SectionConfig, WebsiteConfig } from "@/types/website";
import type { BusinessProfile } from "@/lib/business/types";
import type { Product } from "@/types/ai";
import { hasSection, getSectionDefinition } from "@/lib/store/registry/catalog";
import { isRealCategory } from "@/lib/store/catalog";

/**
 * Lightweight data needs for a section. Prefer Registry metadata when present;
 * otherwise fall back to the known section-type map below.
 */
export type SectionDataRequirements = {
  products?: boolean;
  productImages?: boolean;
  gallery?: boolean;
  categories?: boolean;
  attributes?: string[];
  minProducts?: number;
};

/** Always keep structural chrome even when sparse. */
const ALWAYS_KEEP = new Set([
  "hero",
  "footer",
  "header",
  "announcement",
  "navigation",
  "cta",
  "newsletter",
  "contact",
  "about",
  "faq",
  "promo",
]);

/**
 * Default requirements for vertical / commerce sections.
 * Registry `dataRequirements` overrides these when defined.
 */
export const DEFAULT_SECTION_DATA_REQUIREMENTS: Record<
  string,
  SectionDataRequirements
> = {
  products: { products: true, minProducts: 1 },
  "featured-products": { products: true, minProducts: 1 },
  bestsellers: { products: true, minProducts: 1 },
  "product-spotlight": { products: true, minProducts: 1 },
  "product-finder": { products: true, minProducts: 1 },
  categories: { categories: true },
  gallery: { gallery: true },
  lookbook: { gallery: true },
  "shop-the-look": { gallery: true },
  "room-inspiration": { gallery: true },
  "shop-by-concern": { products: true, attributes: ["concerns"] },
  "shop-by-skin-type": { products: true, attributes: ["skinType"] },
  "ingredient-story": { products: true, attributes: ["ingredients"] },
  routine: { products: true, attributes: ["routineStep"] },
  "shop-by-material": { products: true, attributes: ["material"] },
  "shop-by-occasion": { products: true, attributes: ["occasion"] },
  "stack-builder": { products: true, attributes: ["stackable"] },
  "origin-explorer": { products: true, attributes: ["origin"] },
  "flavor-profile": { products: true, attributes: ["flavorNotes"] },
  "coffee-finder": { products: true, attributes: ["roastLevel"] },
  "shop-by-room": { products: true, attributes: ["room"] },
  "shop-by-designer": { products: true, attributes: ["designer"] },
  materials: { products: true, attributes: ["material"] },
  dimensions: { products: true, attributes: ["dimensions"] },
  "fit-guide": { products: true, attributes: ["fit"] },
  "collection-story": { products: true, minProducts: 1 },
  "designer-spotlight": { products: true, attributes: ["designer"] },
  projects: { gallery: true },
};

export type BusinessDataAvailability = {
  productCount: number;
  productsWithImages: number;
  galleryCount: number;
  hasCategories: boolean;
  attributeKeys: Set<string>;
};

export function inspectBusinessData(params: {
  profile: BusinessProfile;
  products: Product[];
  galleryCount: number;
}): BusinessDataAvailability {
  const attributeKeys = new Set<string>();
  for (const product of params.products) {
    const attrs = product.industryData?.attributes;
    if (!attrs) continue;
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null) continue;
      if (typeof value === "string" && !value.trim()) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      attributeKeys.add(key);
    }
  }
  for (const source of params.profile.products ?? []) {
    for (const [key, value] of Object.entries(source.attributes ?? {})) {
      if (value == null) continue;
      if (typeof value === "string" && !value.trim()) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      attributeKeys.add(key);
    }
  }

  const hasCategories = params.products.some((p) => isRealCategory(p.category));

  return {
    productCount: params.products.length,
    productsWithImages: params.products.filter((p) => p.imageIds.length > 0)
      .length,
    galleryCount: params.galleryCount,
    hasCategories,
    attributeKeys,
  };
}

function requirementsFor(
  type: string,
  section: SectionConfig,
): SectionDataRequirements | null {
  const def = getSectionDefinition(type);
  const fromRegistry = (
    def as { dataRequirements?: SectionDataRequirements } | undefined
  )?.dataRequirements;
  if (fromRegistry) return fromRegistry;

  const filterAttr = section.settings?.filterAttribute;
  if (typeof filterAttr === "string" && filterAttr.trim()) {
    return {
      products: true,
      attributes: [filterAttr.trim()],
      ...(DEFAULT_SECTION_DATA_REQUIREMENTS[type] ?? {}),
    };
  }

  return DEFAULT_SECTION_DATA_REQUIREMENTS[type] ?? null;
}

export function sectionSatisfiesData(
  type: string,
  section: SectionConfig,
  data: BusinessDataAvailability,
): boolean {
  if (ALWAYS_KEEP.has(type)) return true;
  const req = requirementsFor(type, section);
  if (!req) return true;

  if (req.products && data.productCount < (req.minProducts ?? 1)) {
    return false;
  }
  if (req.productImages && data.productsWithImages < 1) return false;
  if (req.gallery && data.galleryCount < 1) return false;
  if (req.categories && !data.hasCategories) return false;
  if (req.attributes?.length) {
    const ok = req.attributes.some((key) => data.attributeKeys.has(key));
    if (!ok) return false;
  }
  return true;
}

/**
 * Drop data-dependent sections that cannot be honestly populated.
 * Unknown registry types are skipped. Structural sections always kept.
 */
export function filterSectionsByAvailableData(
  sections: SectionConfig[],
  data: BusinessDataAvailability,
): SectionConfig[] {
  const filtered = sections.filter((section) => {
    const type = String(section.type);
    if (!hasSection(type)) return false;
    return sectionSatisfiesData(type, section, data);
  });

  if (filtered.some((s) => s.type === "hero") && filtered.some((s) => s.type === "footer")) {
    return filtered;
  }

  // Extreme sparsity: keep a minimal honest shell
  const shell: SectionConfig[] = [];
  const hero = sections.find((s) => s.type === "hero");
  const footer = sections.find((s) => s.type === "footer");
  if (hero) shell.push(hero);
  else shell.push({ id: "fallback-hero", type: "hero", visible: true });
  if (data.productCount > 0) {
    const products = sections.find((s) => s.type === "products");
    shell.push(
      products ?? { id: "fallback-products", type: "products", visible: true },
    );
  }
  if (footer) shell.push(footer);
  else shell.push({ id: "fallback-footer", type: "footer", visible: true });
  return shell;
}

/** Apply data-aware filtering onto a built WebsiteConfig (immutable). */
export function applyDataAwareComposition(
  config: WebsiteConfig,
  data: BusinessDataAvailability,
): WebsiteConfig {
  return {
    ...config,
    sections: filterSectionsByAvailableData(config.sections, data),
  };
}
