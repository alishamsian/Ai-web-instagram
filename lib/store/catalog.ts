import type { WebsiteConfig } from "@/types/website";
import {
  ensureCatalogProduct,
  type CatalogProduct,
} from "@/lib/website/product";
import type { StoreCatalogProduct, StoreCategory } from "@/lib/store/theme";

const JUNK_CATEGORIES = new Set([
  "image",
  "video",
  "reel",
  "sidecar",
  "carousel",
  "general",
]);

export function isRealCategory(category?: string | null) {
  const raw = category?.trim() ?? "";
  if (!raw) return false;
  return !JUNK_CATEGORIES.has(raw.toLowerCase());
}

export function categoryLabel(
  category: string | null | undefined,
  isFa: boolean,
  fallback?: string,
) {
  if (isRealCategory(category)) return category!.trim();
  return fallback ?? (isFa ? "مجموعه" : "Collection");
}

export function getStoreCatalog(
  config: WebsiteConfig,
  options?: { includeHidden?: boolean },
): StoreCatalogProduct[] {
  const locale = config.settings.language;
  const raw = (config.content.products?.items ?? []).filter(
    (item) => options?.includeHidden || !item.hidden,
  );

  return raw.map((item, index) =>
    enrichProduct(ensureCatalogProduct(item, index, locale), index, locale),
  );
}

function enrichProduct(
  item: CatalogProduct,
  index: number,
  locale: "fa" | "en",
): StoreCatalogProduct {
  void locale;
  // Do not invent ranking / "best seller" claims from position alone.
  // Do not invent short descriptions when source has none.
  return {
    ...item,
    category: isRealCategory(item.category) ? item.category : "",
    shortDescription: item.description?.slice(0, 90) || "",
    compareAtPrice: null,
    badges: [],
    isNew: false,
    isBestSeller: false,
    featured: index < 4 && item.confidence >= 0.85,
  };
}

/** Real product categories only — empty if fewer than 2 distinct real labels. */
export function getStoreCategories(
  config: WebsiteConfig,
  catalog: StoreCatalogProduct[],
): StoreCategory[] {
  const isFa = config.settings.language === "fa";
  const titles = Array.from(
    new Set(
      catalog
        .map((p) => p.category?.trim())
        .filter((c): c is string => isRealCategory(c)),
    ),
  ).slice(0, 4);

  if (titles.length < 2) return [];

  return titles.map((title, index) => {
    const match =
      catalog.find((p) => p.category === title) ??
      catalog[index % Math.max(catalog.length, 1)];
    return {
      id: `cat-${index + 1}`,
      title,
      description: isFa ? "مشاهده مجموعه" : "Browse the set",
      imageId: match?.imageIds[0],
      href: `#shop`,
    };
  });
}

/** Featured strip when catalog has enough items. */
export function getFeaturedProducts(catalog: StoreCatalogProduct[], count = 4) {
  if (catalog.length < 4) return [];
  const featured = catalog.filter((p) => p.featured);
  return (featured.length ? featured : catalog).slice(0, count);
}

export function getBestSellerProducts(
  catalog: StoreCatalogProduct[],
  count = 4,
) {
  const best = catalog.filter((p) => p.isBestSeller);
  if (best.length >= 2) return best.slice(0, count);
  return catalog.slice(
    Math.min(2, catalog.length),
    Math.min(2 + count, catalog.length),
  );
}

export function getNewArrivalProducts(
  catalog: StoreCatalogProduct[],
  count = 4,
) {
  const newest = catalog.filter((p) => p.isNew);
  if (newest.length >= 2) return newest.slice(0, count);
  return catalog.slice(0, count);
}

export function findStoreProduct(catalog: StoreCatalogProduct[], slug: string) {
  return catalog.find((p) => p.slug === slug || p.id === slug);
}

export function relatedProducts(
  catalog: StoreCatalogProduct[],
  product: StoreCatalogProduct,
  count = 4,
) {
  const same = catalog.filter(
    (p) =>
      p.slug !== product.slug &&
      isRealCategory(p.category) &&
      p.category === product.category,
  );
  const rest = catalog.filter((p) => p.slug !== product.slug);
  return [...same, ...rest.filter((p) => !same.includes(p))].slice(0, count);
}

export function productForGalleryImage(
  catalog: StoreCatalogProduct[],
  imageId: string,
) {
  return catalog.find((p) => p.imageIds.includes(imageId));
}

export function ensureProductList(config: WebsiteConfig) {
  const locale = config.settings.language;
  return (config.content.products?.items ?? []).map((item, index) =>
    ensureCatalogProduct(item, index, locale),
  );
}
