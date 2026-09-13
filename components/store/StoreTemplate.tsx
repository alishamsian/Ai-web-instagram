"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { WebsiteRenderMode } from "@/components/editor/EditContext";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import {
  getStoreCatalog,
  getStoreCategories,
  getFeaturedProducts,
  getBestSellerProducts,
  getNewArrivalProducts,
  findStoreProduct,
} from "@/lib/store/catalog";
import { StoreCartProvider } from "@/lib/store/cart";
import { StoreRoot } from "@/components/store/StoreRoot";
import { StoreAnnouncement, StoreHeader } from "@/components/store/StoreHeader";
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
        fallbackLabel ?? sectionLabel(type, config.settings.language)
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

function gridColumns(config: WebsiteConfig): 2 | 3 | 4 | 5 {
  const raw = config.sections.find((s) => s.type === "products")?.settings
    ?.columns;
  const n = Number(raw);
  if (n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 4;
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
  const bestsellers = useMemo(
    () => getBestSellerProducts(shopProducts, 4),
    [shopProducts],
  );
  const newArrivals = useMemo(
    () => getNewArrivalProducts(shopProducts, 4),
    [shopProducts],
  );
  const spotlight = featured[0] ?? shopProducts[0];
  const columns = gridColumns(config);

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

  const orderedTypes = config.sections
    .filter((s) => s.type !== "footer")
    .map((s) => s.type) as WebsiteSectionType[];

  const sequence: WebsiteSectionType[] = orderedTypes.length
    ? orderedTypes
    : ["hero", "products", "about", "gallery", "faq", "contact"];

  const commerceExtras = (
    <>
      <StoreCategories config={config} categories={categories} />
      {newArrivals.length >= 2 ? (
        <StoreProductGrid
          config={config}
          products={newArrivals}
          id="featured"
          columns={4}
          soft={false}
          variant="rail"
          kicker={isFa ? "تازه‌ها" : "New arrivals"}
          title={isFa ? "تازه‌واردها" : "Just arrived"}
          lead={
            isFa
              ? "انتخاب‌های تازه از ویترین."
              : "Fresh picks from the storefront."
          }
          onQuickView={onQuickView}
        />
      ) : featured.length ? (
        <StoreProductGrid
          config={config}
          products={featured}
          id="featured"
          columns={4}
          soft={false}
          variant="rail"
          kicker={isFa ? "منتخب" : "Featured"}
          title={isFa ? "تازه‌های ویترین" : "Fresh from the shop"}
          onQuickView={onQuickView}
        />
      ) : null}
      {spotlight ? (
        <StoreProductSpotlight
          config={config}
          product={spotlight}
          onQuickView={onQuickView}
        />
      ) : null}
    </>
  );

  const hasCta = sequence.includes("cta");
  const nodes: ReactNode[] = [];
  let extrasPlaced = false;
  let galleryPlaced = false;

  for (const type of sequence) {
    if (type === "hero" && show("hero")) {
      nodes.push(
        <SectionWrap key="hero" config={config} type="hero" mode={mode}>
          <div className={dim("hero") ? "opacity-45" : undefined}>
            <StoreHero config={config} />
          </div>
        </SectionWrap>,
      );
      nodes.push(<div key="commerce-extras">{commerceExtras}</div>);
      extrasPlaced = true;
      continue;
    }

    if (type === "about" && show("about")) {
      nodes.push(
        <SectionWrap key="about" config={config} type="about" mode={mode}>
          <div className={dim("about") ? "opacity-45" : undefined}>
            <StoreStory config={config} />
          </div>
        </SectionWrap>,
      );
      continue;
    }

    if (type === "products" && show("products")) {
      if (!extrasPlaced) {
        nodes.push(<div key="commerce-extras">{commerceExtras}</div>);
        extrasPlaced = true;
      }
      nodes.push(
        <SectionWrap key="products" config={config} type="products" mode={mode}>
          <div className={dim("products") ? "opacity-45" : undefined}>
            <StoreProductGrid
              config={config}
              products={shopProducts}
              id="shop"
              columns={columns}
              variant="classic"
              editableTitle
              kicker={isFa ? "فروشگاه" : "Shop"}
              title={
                config.content.products?.title ||
                (isFa ? "همه محصولات" : "All products")
              }
              onQuickView={onQuickView}
            />
            {bestsellers.length >= 2 ? (
              <StoreProductGrid
                config={config}
                products={bestsellers}
                id="bestsellers"
                columns={4}
                soft={false}
                variant="compact"
                kicker={isFa ? "پرفروش" : "Bestsellers"}
                title={isFa ? "محبوب‌ترین‌ها" : "Most loved"}
                onQuickView={onQuickView}
              />
            ) : null}
          </div>
        </SectionWrap>,
      );
      if (!hasCta) {
        nodes.push(<StorePromo key="promo" config={config} />);
      }
      continue;
    }

    if (type === "cta") {
      nodes.push(<StorePromo key="cta" config={config} />);
      continue;
    }

    if (
      (type === "gallery" || type === "instagram-feed") &&
      !galleryPlaced &&
      (show("gallery") || show("instagram-feed", false))
    ) {
      galleryPlaced = true;
      nodes.push(
        <SectionWrap
          key="gallery"
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
        </SectionWrap>,
      );
      continue;
    }

    if (type === "faq" && show("faq")) {
      nodes.push(
        <SectionWrap key="faq" config={config} type="faq" mode={mode}>
          <div className={dim("faq") ? "opacity-45" : undefined}>
            <StoreFAQ config={config} />
          </div>
        </SectionWrap>,
      );
      continue;
    }

    if (type === "contact" && show("contact")) {
      nodes.push(
        <SectionWrap key="contact" config={config} type="contact" mode={mode}>
          <div className={dim("contact") ? "opacity-45" : undefined}>
            <StoreContact config={config} />
            <StoreNewsletter config={config} />
          </div>
        </SectionWrap>,
      );
    }
  }

  if (!extrasPlaced) {
    nodes.unshift(<div key="commerce-extras">{commerceExtras}</div>);
  }

  return (
    <>
      <StoreAnnouncement config={config} />
      <StoreHeader config={config} hasCategories={categories.length > 0} />
      <main>{nodes}</main>
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
