"use client";

import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import {
  getBestSellerProducts,
  getFeaturedProducts,
  getNewArrivalProducts,
} from "@/lib/store/catalog";
import { resolveResponsiveColumns } from "@/lib/editor/responsive";
import { StoreHero, StoreCategories } from "@/components/store/StoreHero";
import {
  StoreProductGrid,
  StoreProductSpotlight,
  StoreNewsletter,
} from "@/components/store/StoreProductCard";
import {
  StoreStory,
  StoreLookbook,
  StorePromo,
  StoreFAQ,
  StoreContact,
} from "@/components/store/StoreProductPage";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreSectionFallback } from "@/components/store/StoreSectionFallback";

function gridColumns(ctx: StoreSectionContext): {
  mobile: number;
  tablet: number;
  desktop: number;
} {
  return resolveResponsiveColumns(ctx.section.settings?.columns, 4);
}

function productsBySource(
  ctx: StoreSectionContext,
  fallback: "featured" | "bestsellers" | "new" | "all" = "all",
): StoreCatalogProduct[] {
  const source =
    (ctx.section.settings?.productSource as string) ?? fallback;
  if (source === "bestsellers") {
    return getBestSellerProducts(ctx.shopProducts, 8);
  }
  if (source === "new") {
    return getNewArrivalProducts(ctx.shopProducts, 8);
  }
  if (source === "featured") {
    const featured = getFeaturedProducts(ctx.shopProducts, 8);
    if (featured.length) return featured;
    return getNewArrivalProducts(ctx.shopProducts, 8);
  }
  return ctx.shopProducts;
}

/** Independent section adapters — one SectionConfig → one visual block. */

export function renderHeroSection(ctx: StoreSectionContext) {
  return <StoreHero config={ctx.config} />;
}

export function renderCategoriesSection(ctx: StoreSectionContext) {
  if (ctx.categories.length === 0) return null;
  return (
    <StoreCategories config={ctx.config} categories={ctx.categories} />
  );
}

export function renderFeaturedProductsSection(ctx: StoreSectionContext) {
  const isFa = ctx.config.settings.language === "fa";
  const source = (ctx.section.settings?.productSource as string) ?? "featured";
  const preferNew = source === "new";
  const newArrivals = getNewArrivalProducts(ctx.shopProducts, 4);
  const featured = getFeaturedProducts(ctx.shopProducts, 4);
  const products =
    preferNew && newArrivals.length >= 2
      ? newArrivals
      : newArrivals.length >= 2
        ? newArrivals
        : featured;

  if (!products.length) return null;

  const isNew = products === newArrivals && newArrivals.length >= 2;
  return (
    <StoreProductGrid
      config={ctx.config}
      products={products}
      id={`featured-${ctx.section.id}`}
      columns={4}
      soft={false}
      variant="rail"
      kicker={isNew ? (isFa ? "تازه‌ها" : "New arrivals") : isFa ? "منتخب" : "Featured"}
      title={
        isNew
          ? isFa
            ? "تازه‌واردها"
            : "Just arrived"
          : isFa
            ? "تازه‌های ویترین"
            : "Fresh from the shop"
      }
      lead={
        isNew
          ? isFa
            ? "انتخاب‌های تازه از ویترین."
            : "Fresh picks from the storefront."
          : undefined
      }
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderProductSpotlightSection(ctx: StoreSectionContext) {
  const featured = getFeaturedProducts(ctx.shopProducts, 1);
  const product = featured[0] ?? ctx.shopProducts[0];
  if (!product) return null;
  return (
    <StoreProductSpotlight
      config={ctx.config}
      product={product}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderProductsSection(ctx: StoreSectionContext) {
  const isFa = ctx.config.settings.language === "fa";
  const variant =
    (ctx.section.variant as "classic" | "compact" | "editorial") || "classic";
  return (
    <StoreProductGrid
      config={ctx.config}
      products={ctx.shopProducts}
      id={`shop-${ctx.section.id}`}
      columns={gridColumns(ctx)}
      variant={variant}
      editableTitle
      kicker={isFa ? "فروشگاه" : "Shop"}
      title={
        ctx.config.content.products?.title ||
        (isFa ? "همه محصولات" : "All products")
      }
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderBestsellersSection(ctx: StoreSectionContext) {
  const isFa = ctx.config.settings.language === "fa";
  const products = productsBySource(ctx, "bestsellers").slice(0, 4);
  if (products.length < 2) return null;
  return (
    <StoreProductGrid
      config={ctx.config}
      products={products}
      id={`bestsellers-${ctx.section.id}`}
      columns={4}
      soft={false}
      variant="compact"
      kicker={isFa ? "پرفروش" : "Bestsellers"}
      title={isFa ? "محبوب‌ترین‌ها" : "Most loved"}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderAboutSection(ctx: StoreSectionContext) {
  return <StoreStory config={ctx.config} />;
}

export function renderGallerySection(ctx: StoreSectionContext) {
  return <StoreLookbook config={ctx.config} catalog={ctx.catalog} />;
}

export function renderFaqSection(ctx: StoreSectionContext) {
  return <StoreFAQ config={ctx.config} />;
}

export function renderContactSection(ctx: StoreSectionContext) {
  return (
    <>
      <StoreContact config={ctx.config} />
      <StoreNewsletter config={ctx.config} />
    </>
  );
}

export function renderPromoSection(ctx: StoreSectionContext) {
  return <StorePromo config={ctx.config} />;
}

export function renderFooterSection(ctx: StoreSectionContext) {
  return (
    <StoreFooter
      config={ctx.config}
      hasCategories={ctx.categories.length > 0}
    />
  );
}

export function renderUnsupportedStoreSection(ctx: StoreSectionContext) {
  return (
    <StoreSectionFallback
      type={ctx.section.type}
      locale={ctx.config.settings.language}
      mode={ctx.mode}
    />
  );
}
