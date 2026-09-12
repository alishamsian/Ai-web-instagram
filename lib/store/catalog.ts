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
  const badges: string[] = [];
  // Only surface a badge when confidence is high (AI-ish signal) and item is first.
  if (item.confidence >= 0.85 && index === 0) {
    badges.push(locale === "fa" ? "ویژه" : "Featured");
  }

  return {
    ...item,
    category: isRealCategory(item.category) ? item.category : "",
    shortDescription:
      item.description?.slice(0, 110) ||
      (locale === "fa"
        ? "از ویترین برند — برای جزئیات و سفارش پیام بدهید."
        : "From the brand showcase — message to order."),
    compareAtPrice: null,
    badges,
    isNew: false,
    isBestSeller: false,
    featured: index < 4,
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

/** First up-to-4 products when catalog is large enough to warrant a featured strip. */
export function getFeaturedProducts(catalog: StoreCatalogProduct[], count = 4) {
  if (catalog.length < 5) return [];
  return catalog.filter((p) => p.featured).slice(0, count);
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
