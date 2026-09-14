"use client";

import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import {
  getBestSellerProducts,
  getFeaturedProducts,
  getNewArrivalProducts,
} from "@/lib/store/catalog";
import { resolveResponsiveColumns } from "@/lib/editor/responsive";
import { resolveSectionVariant } from "@/lib/store/registry/variant-api";
import { StoreHero, StoreCategories } from "@/components/store/StoreHero";
import {
  StoreProductGrid,
  StoreProductSpotlight,
  StoreNewsletter,
} from "@/components/store/StoreProductCard";
import { StoreFAQ, StoreContact } from "@/components/store/StoreProductPage";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreSectionFallback } from "@/components/store/StoreSectionFallback";
import { HeroFan } from "@/components/store/variants/hero/HeroFan";
import {
  AboutStory,
  AboutEditorial,
  AboutImageLed,
} from "@/components/store/variants/about/AboutVariants";
import {
  GalleryLookbook,
  GalleryGrid,
  GalleryMasonry,
  GalleryCollage,
} from "@/components/store/variants/gallery/GalleryVariants";
import {
  CtaBanner,
  CtaPromo,
  CtaMinimal,
} from "@/components/store/variants/cta/CtaVariants";
import {
  TrustMetrics,
  TrustInline,
  TrustQuotes,
} from "@/components/store/variants/trust/TrustVariants";
import {
  ProductsScrollRail,
  FeaturedSpotlight,
} from "@/components/store/variants/products/ProductLayouts";

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

function variantId(ctx: StoreSectionContext, type = ctx.section.type) {
  return resolveSectionVariant(type, ctx.section.variant).id;
}

/** Independent section adapters — one SectionConfig → one visual block. */

export function renderHeroSection(ctx: StoreSectionContext) {
  const id = variantId(ctx, "hero");
  if (id === "fan") return <HeroFan config={ctx.config} />;
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
  const newArrivals = getNewArrivalProducts(ctx.shopProducts, 6);
  const featured = getFeaturedProducts(ctx.shopProducts, 6);
  const products =
    preferNew && newArrivals.length >= 2
      ? newArrivals
      : newArrivals.length >= 2
        ? newArrivals
        : featured;

  if (!products.length) return null;

  const isNew = products === newArrivals && newArrivals.length >= 2;
  const kicker = isNew
    ? isFa
      ? "تازه‌ها"
      : "New arrivals"
    : isFa
      ? "منتخب"
      : "Featured";
  const title = isNew
    ? isFa
      ? "تازه‌واردها"
      : "Just arrived"
    : isFa
      ? "تازه‌های ویترین"
      : "Fresh from the shop";
  const lead = isNew
    ? isFa
      ? "انتخاب‌های تازه از ویترین."
      : "Fresh picks from the storefront."
    : undefined;
  const id = `featured-${ctx.section.id}`;
  const variant = variantId(ctx) ?? "rail";

  if (variant === "spotlight") {
    return (
      <FeaturedSpotlight
        config={ctx.config}
        products={products}
        id={id}
        kicker={kicker}
        title={title}
        onQuickView={ctx.onQuickView}
      />
    );
  }

  if (variant === "classic") {
    return (
      <StoreProductGrid
        config={ctx.config}
        products={products}
        id={id}
        columns={4}
        soft={false}
        variant="classic"
        kicker={kicker}
        title={title}
        lead={lead}
        onQuickView={ctx.onQuickView}
      />
    );
  }

  if (variant === "editorial") {
    return (
      <StoreProductGrid
        config={ctx.config}
        products={products.slice(0, 4)}
        id={id}
        columns={3}
        soft
        variant="editorial"
        kicker={kicker}
        title={title}
        lead={lead}
        onQuickView={ctx.onQuickView}
      />
    );
  }

  return (
    <StoreProductGrid
      config={ctx.config}
      products={products}
      id={id}
      columns={4}
      soft={false}
      variant="rail"
      kicker={kicker}
      title={title}
      lead={lead}
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
  const variant = variantId(ctx) ?? "classic";
  const title =
    ctx.config.content.products?.title ||
    (isFa ? "همه محصولات" : "All products");
  const kicker = isFa ? "فروشگاه" : "Shop";
  const id = `shop-${ctx.section.id}`;

  if (variant === "rail") {
    return (
      <ProductsScrollRail
        config={ctx.config}
        products={ctx.shopProducts}
        id={id}
        kicker={kicker}
        title={title}
        onQuickView={ctx.onQuickView}
      />
    );
  }

  const gridVariant =
    variant === "compact" || variant === "editorial" ? variant : "classic";

  return (
    <StoreProductGrid
      config={ctx.config}
      products={ctx.shopProducts}
      id={id}
      columns={
        gridVariant === "editorial"
          ? { mobile: 1, tablet: 2, desktop: 3 }
          : gridVariant === "compact"
            ? { mobile: 2, tablet: 3, desktop: 5 }
            : gridColumns(ctx)
      }
      variant={gridVariant}
      editableTitle
      kicker={kicker}
      title={title}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderBestsellersSection(ctx: StoreSectionContext) {
  const isFa = ctx.config.settings.language === "fa";
  const products = productsBySource(ctx, "bestsellers").slice(0, 8);
  if (products.length < 2) return null;
  const variant = variantId(ctx) ?? "compact";
  const id = `bestsellers-${ctx.section.id}`;
  const kicker = isFa ? "پرفروش" : "Bestsellers";
  const title = isFa ? "محبوب‌ترین‌ها" : "Most loved";

  if (variant === "rail") {
    return (
      <ProductsScrollRail
        config={ctx.config}
        products={products}
        id={id}
        kicker={kicker}
        title={title}
        onQuickView={ctx.onQuickView}
      />
    );
  }

  return (
    <StoreProductGrid
      config={ctx.config}
      products={products.slice(0, variant === "classic" ? 6 : 4)}
      id={id}
      columns={variant === "classic" ? 3 : 4}
      soft={false}
      variant={variant === "classic" ? "classic" : "compact"}
      kicker={kicker}
      title={title}
      onQuickView={ctx.onQuickView}
    />
  );
}

export function renderAboutSection(ctx: StoreSectionContext) {
  const variant = variantId(ctx) ?? "story";
  if (variant === "editorial") return <AboutEditorial config={ctx.config} />;
  if (variant === "image-led") return <AboutImageLed config={ctx.config} />;
  return <AboutStory config={ctx.config} />;
}

export function renderGallerySection(ctx: StoreSectionContext) {
  const variant = variantId(ctx) ?? "lookbook";
  if (variant === "grid") {
    return <GalleryGrid config={ctx.config} catalog={ctx.catalog} />;
  }
  if (variant === "masonry") {
    return <GalleryMasonry config={ctx.config} catalog={ctx.catalog} />;
  }
  if (variant === "collage") {
    return <GalleryCollage config={ctx.config} catalog={ctx.catalog} />;
  }
  return <GalleryLookbook config={ctx.config} catalog={ctx.catalog} />;
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
  const variant = variantId(ctx) ?? "banner";
  if (variant === "promo") return <CtaPromo config={ctx.config} />;
  if (variant === "minimal") return <CtaMinimal config={ctx.config} />;
  return <CtaBanner config={ctx.config} />;
}

export function renderTrustSection(ctx: StoreSectionContext) {
  const variant =
    variantId(ctx) ??
    (ctx.section.type === "testimonials" ? "quotes" : "metrics");
  if (variant === "inline") return <TrustInline config={ctx.config} />;
  if (variant === "quotes") return <TrustQuotes config={ctx.config} />;
  return <TrustMetrics config={ctx.config} />;
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
