"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type { WebsiteRenderMode } from "@/components/editor/EditContext";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import {
  getStoreCatalog,
  getStoreCategories,
  findStoreProduct,
} from "@/lib/store/catalog";
import { StoreCartProvider } from "@/lib/store/cart";
import { StoreRoot } from "@/components/store/StoreRoot";
import { StoreAnnouncement, StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreProductPage } from "@/components/store/StoreProductPage";
import { StoreQuickView } from "@/components/store/StoreQuickView";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { EditorSectionFrame } from "@/components/editor/EditorSectionFrame";
import { sectionLabel } from "@/components/editor/editor-utils";
import { getSectionDefinition } from "@/lib/store/registry";
import {
  resolveStoreBodySections,
  resolveStoreFooterSection,
  sectionIsDimmed,
  sectionRenderKey,
  shouldRenderFooter,
} from "@/lib/store/registry/resolve";
import { renderRegisteredStoreSection } from "@/components/store/section-renderers";
import "@/components/store/bind-store-renderers";
import { cn } from "@/lib/utils";

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

function SectionFrame({
  section,
  mode,
  locale,
  children,
}: {
  section: SectionConfig;
  mode: WebsiteRenderMode;
  locale: "fa" | "en";
  children: ReactNode;
}) {
  if (mode !== "editor") return <>{children}</>;
  const def = getSectionDefinition(section.type);
  const label =
    def?.label[locale] ?? sectionLabel(section.type as never, locale);
  return (
    <EditorSectionFrame
      sectionId={section.id}
      label={label}
      settings={section.settings}
    >
      {children}
    </EditorSectionFrame>
  );
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
  const shopProducts = useMemo(
    () => resolveProductList(config, catalog),
    [config, catalog],
  );

  const bodySections = useMemo(
    () => resolveStoreBodySections(config, mode),
    [config, mode],
  );

  const footerSection = resolveStoreFooterSection(config);
  const showFooter = shouldRenderFooter(config, mode);

  return (
    <>
      <StoreAnnouncement config={config} />
      <StoreHeader config={config} hasCategories={categories.length > 0} />
      <main>
        {bodySections.map((section) => {
          const body = renderRegisteredStoreSection({
            config,
            section,
            mode,
            catalog,
            categories,
            shopProducts,
            onQuickView,
          });
          if (body == null) return null;
          return (
            <SectionFrame
              key={sectionRenderKey(section)}
              section={section}
              mode={mode}
              locale={config.settings.language}
            >
              <div
                className={cn(sectionIsDimmed(section, mode) && "opacity-45")}
              >
                {body}
              </div>
            </SectionFrame>
          );
        })}
      </main>
      {showFooter ? (
        footerSection ? (
          <SectionFrame
            section={footerSection}
            mode={mode}
            locale={config.settings.language}
          >
            <div
              className={cn(
                sectionIsDimmed(footerSection, mode) && "opacity-45",
              )}
            >
              <StoreFooter
                config={config}
                hasCategories={categories.length > 0}
              />
            </div>
          </SectionFrame>
        ) : (
          <StoreFooter
            config={config}
            hasCategories={categories.length > 0}
          />
        )
      ) : null}
    </>
  );
}

/**
 * Unified Store renderer for editor / preview / published.
 * Composition: normalizeStoreSections(WebsiteConfig.sections) → Registry renderers.
 */
export function StoreRenderer({
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
            <div
              className="store-wrap store-empty"
              style={{ padding: "4rem 0" }}
            >
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
