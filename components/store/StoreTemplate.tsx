"use client";

import { useMemo, useState } from "react";
import type { WebsiteConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import {
  getStoreCatalog,
  getStoreCategories,
  getFeaturedProducts,
  findStoreProduct,
} from "@/lib/store/catalog";
import { StoreCartProvider } from "@/lib/store/cart";
import { StoreRoot } from "@/components/store/StoreRoot";
import { StoreAnnouncement, StoreHeader } from "@/components/store/StoreHeader";
import { StoreHero, StoreCategories } from "@/components/store/StoreHero";
import { StoreProductGrid } from "@/components/store/StoreProductCard";
import {
  StoreStory,
  StoreLookbook,
  StorePromo,
  StoreFAQ,
  StoreContact,
  StoreProductPage,
} from "@/components/store/StoreProductPage";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreQuickView } from "@/components/store/StoreQuickView";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";

function StoreHome({
  config,
  catalog,
  categories,
  onQuickView,
}: {
  config: WebsiteConfig;
  catalog: StoreCatalogProduct[];
  categories: ReturnType<typeof getStoreCategories>;
  onQuickView: (product: StoreCatalogProduct) => void;
}) {
  const isFa = config.settings.language === "fa";
  const featured = useMemo(() => getFeaturedProducts(catalog, 4), [catalog]);
  const show = (type: string, fallback = true) => {
    const section = config.sections.find((item) => item.type === type);
    if (!section) return fallback;
    return section.visible;
  };

  return (
    <>
      <StoreAnnouncement config={config} />
      <StoreHeader config={config} hasCategories={categories.length > 0} />
      <main>
        {show("hero") ? <StoreHero config={config} /> : null}
        <StoreCategories config={config} categories={categories} />
        {featured.length ? (
          <StoreProductGrid
            config={config}
            products={featured}
            id="featured"
            columns={4}
            kicker={isFa ? "منتخب" : "Featured"}
            title={isFa ? "تازه‌های ویترین" : "Fresh from the shop"}
            onQuickView={onQuickView}
          />
        ) : null}
        {show("about") ? <StoreStory config={config} /> : null}
        {show("products") ? (
          <StoreProductGrid
            config={config}
            products={catalog}
            id="shop"
            columns={4}
            kicker={isFa ? "فروشگاه" : "Shop"}
            title={
              config.content.products?.title ||
              (isFa ? "همه محصولات" : "All products")
            }
            onQuickView={onQuickView}
          />
        ) : null}
        <StorePromo config={config} />
        {show("gallery") || show("instagram-feed", false) ? (
          <StoreLookbook config={config} catalog={catalog} />
        ) : null}
        {show("faq") ? <StoreFAQ config={config} /> : null}
        {show("contact") ? <StoreContact config={config} /> : null}
      </main>
      <StoreFooter config={config} hasCategories={categories.length > 0} />
    </>
  );
}

export function StoreTemplate({
  config,
  productSlug,
  websiteId,
}: {
  config: WebsiteConfig;
  productSlug?: string;
  websiteId?: string;
}) {
  const catalog = useMemo(() => getStoreCatalog(config), [config]);
  const categories = useMemo(
    () => getStoreCategories(config, catalog),
    [config, catalog],
  );
  const [quick, setQuick] = useState<StoreCatalogProduct | null>(null);
  const product = productSlug
    ? findStoreProduct(catalog, productSlug)
    : undefined;

  return (
    <StoreCartProvider storageKey={`vitrin-cart:${config.brand.name}`}>
      <StoreRoot config={config}>
        {productSlug ? (
          product ? (
            <StoreProductPage
              config={config}
              product={product}
              catalog={catalog}
              hasCategories={categories.length > 0}
              onQuickView={setQuick}
            />
          ) : (
            <div className="store-wrap store-empty" style={{ padding: "4rem 0" }}>
              <p className="store-heading">
                {config.settings.language === "fa"
                  ? "محصول پیدا نشد."
                  : "Product not found."}
              </p>
            </div>
          )
        ) : (
          <StoreHome
            config={config}
            catalog={catalog}
            categories={categories}
            onQuickView={setQuick}
          />
        )}
        <StoreQuickView
          config={config}
          product={quick}
          open={Boolean(quick)}
          onOpenChange={(open) => {
            if (!open) setQuick(null);
          }}
        />
        <StoreCartDrawer config={config} websiteId={websiteId} />
      </StoreRoot>
    </StoreCartProvider>
  );
}
