"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { WebsiteRenderMode } from "@/components/editor/EditContext";
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
import { EditorSectionFrame } from "@/components/editor/EditorSectionFrame";
import { sectionLabel } from "@/components/editor/editor-utils";

function SectionWrap({
  config,
  type,
  mode,
  children,
  fallbackLabel,
}: {
  config: WebsiteConfig;
  type: WebsiteSectionType;
  mode: WebsiteRenderMode;
  children: ReactNode;
  fallbackLabel?: string;
}) {
  const section = config.sections.find((item) => item.type === type);
  if (mode !== "editor" || !section) return <>{children}</>;
  return (
    <EditorSectionFrame
      sectionId={section.id}
      label={
        fallbackLabel ??
        sectionLabel(type, config.settings.language)
      }
      settings={section.settings}
    >
      {children}
    </EditorSectionFrame>
  );
}

function resolveProductList(
  config: WebsiteConfig,
  catalog: StoreCatalogProduct[],
) {
  const section = config.sections.find((item) => item.type === "products");
  const source = (section?.settings?.productSource as string) ?? "all";
  if (source === "category") {
    const category = String(section?.settings?.category ?? "").trim();
    if (!category) return catalog;
    return catalog.filter((item) => item.category === category);
  }
  if (source === "manual") {
    const ids = Array.isArray(section?.settings?.manualIds)
      ? (section!.settings!.manualIds as string[])
      : [];
    if (!ids.length) return catalog;
    const byKey = new Map(
      catalog.map((item) => [item.id ?? item.slug ?? item.name, item]),
    );
    return ids
      .map((id) => byKey.get(id))
      .filter((item): item is StoreCatalogProduct => Boolean(item));
  }
  return catalog;
}

function StoreHome({
  config,
  catalog,
  categories,
  mode,
  onQuickView,
}: {
  config: WebsiteConfig;
  catalog: StoreCatalogProduct[];
  categories: ReturnType<typeof getStoreCategories>;
  mode: WebsiteRenderMode;
  onQuickView: (product: StoreCatalogProduct) => void;
}) {
  const isFa = config.settings.language === "fa";
  const shopProducts = useMemo(
    () => resolveProductList(config, catalog),
    [config, catalog],
  );
  const featured = useMemo(
    () => getFeaturedProducts(shopProducts, 4),
    [shopProducts],
  );
  const show = (type: string, fallback = true) => {
    const section = config.sections.find((item) => item.type === type);
    if (!section) return fallback;
    if (mode === "editor") return true;
    return section.visible;
  };
  const dim = (type: string) => {
    const section = config.sections.find((item) => item.type === type);
    return mode === "editor" && section && !section.visible;
  };

  return (
    <>
      <StoreAnnouncement config={config} />
      <StoreHeader config={config} hasCategories={categories.length > 0} />
      <main>
        {show("hero") ? (
          <SectionWrap config={config} type="hero" mode={mode}>
            <div className={dim("hero") ? "opacity-45" : undefined}>
              <StoreHero config={config} />
            </div>
          </SectionWrap>
        ) : null}
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
        {show("about") ? (
          <SectionWrap config={config} type="about" mode={mode}>
            <div className={dim("about") ? "opacity-45" : undefined}>
              <StoreStory config={config} />
            </div>
          </SectionWrap>
        ) : null}
        {show("products") ? (
          <SectionWrap config={config} type="products" mode={mode}>
            <div className={dim("products") ? "opacity-45" : undefined}>
              <StoreProductGrid
                config={config}
                products={shopProducts}
                id="shop"
                columns={4}
                kicker={isFa ? "فروشگاه" : "Shop"}
                title={
                  config.content.products?.title ||
                  (isFa ? "همه محصولات" : "All products")
                }
                onQuickView={onQuickView}
              />
            </div>
          </SectionWrap>
        ) : null}
        <StorePromo config={config} />
        {show("gallery") || show("instagram-feed", false) ? (
          <SectionWrap
            config={config}
            type={show("gallery") ? "gallery" : "instagram-feed"}
            mode={mode}
          >
            <div
              className={
                dim("gallery") || dim("instagram-feed") ? "opacity-45" : undefined
              }
            >
              <StoreLookbook config={config} catalog={catalog} />
            </div>
          </SectionWrap>
        ) : null}
        {show("faq") ? (
          <SectionWrap config={config} type="faq" mode={mode}>
            <div className={dim("faq") ? "opacity-45" : undefined}>
              <StoreFAQ config={config} />
            </div>
          </SectionWrap>
        ) : null}
        {show("contact") ? (
          <SectionWrap config={config} type="contact" mode={mode}>
            <div className={dim("contact") ? "opacity-45" : undefined}>
              <StoreContact config={config} />
            </div>
          </SectionWrap>
        ) : null}
      </main>
      {show("footer") ? (
        <SectionWrap config={config} type="footer" mode={mode}>
          <div className={dim("footer") ? "opacity-45" : undefined}>
            <StoreFooter config={config} hasCategories={categories.length > 0} />
          </div>
        </SectionWrap>
      ) : (
        <StoreFooter config={config} hasCategories={categories.length > 0} />
      )}
    </>
  );
}

export function StoreTemplate({
  config,
  productSlug,
  websiteId,
  mode = "published",
}: {
  config: WebsiteConfig;
  productSlug?: string;
  websiteId?: string;
  mode?: WebsiteRenderMode;
}) {
  const catalog = useMemo(
    () => getStoreCatalog(config, { includeHidden: mode === "editor" }),
    [config, mode],
  );
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
            mode={mode}
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
