"use client";

import type { SectionConfig, WebsiteConfig } from "@/types/website";
import type { WebsiteRenderMode } from "@/components/editor/EditContext";
import {
  AboutSection,
  ContactSection,
  FAQSiteSection,
  FooterSection,
  GallerySection,
  HeroSection,
  ProductsSection,
  ServicesSection,
  TestimonialsSection,
} from "@/components/website/sections";
import {
  CategoriesSiteSection,
  LocationSiteSection,
  LookbookSiteSection,
  MenuSiteSection,
  PortfolioSiteSection,
  PricingSiteSection,
  PromoSiteSection,
  PropertiesSiteSection,
  ShopTheLookSiteSection,
} from "@/components/website/canonical-sections";
import { ProductPageView } from "@/components/website/ProductPage";
import { WebsiteShell } from "@/components/website/shell";
import { SiteNavProvider } from "@/components/website/SiteNavContext";
import { StoreRenderer } from "@/components/store/StoreRenderer";
import { EditorSectionFrame } from "@/components/editor/EditorSectionFrame";
import { CanvasEmptyState } from "@/components/editor/CanvasEmptyState";
import { useEditorEdit } from "@/components/editor/EditContext";
import { sectionLabel } from "@/components/editor/editor-utils";
import { polishWebsiteConfig } from "@/lib/website/polish";
import {
  resolveHomeSections,
  shouldUseCanonicalHomeRenderer,
} from "@/lib/website/canonical-render";
import { cn } from "@/lib/utils";
import { VisualCustomPagePreview } from "@/components/visual-editor/VisualCustomPagePreview";
import { SectionRenderProvider } from "@/components/website/SectionRenderContext";

const sectionMap = {
  hero: HeroSection,
  about: AboutSection,
  products: ProductsSection,
  services: ServicesSection,
  gallery: GallerySection,
  "instagram-feed": GallerySection,
  "featured-posts": GallerySection,
  "featured-products": ProductsSection,
  testimonials: TestimonialsSection,
  faq: FAQSiteSection,
  contact: ContactSection,
  reservations: ContactSection,
  footer: FooterSection,
  cta: PromoSiteSection,
  promo: PromoSiteSection,
  lookbook: LookbookSiteSection,
  "shop-the-look": ShopTheLookSiteSection,
  categories: CategoriesSiteSection,
  pricing: PricingSiteSection,
  menu: MenuSiteSection,
  location: LocationSiteSection,
  portfolio: PortfolioSiteSection,
  projects: PortfolioSiteSection,
  properties: PropertiesSiteSection,
};

function SectionList({
  view,
  sections,
  mode,
  locale,
}: {
  view: WebsiteConfig;
  sections: SectionConfig[];
  mode: WebsiteRenderMode;
  locale: "fa" | "en";
}) {
  const edit = useEditorEdit();
  const visibleSections = sections.filter(
    (section) => section.visible || mode === "editor",
  );
  const bodySections = visibleSections.filter((s) => s.type !== "footer");

  return (
    <>
      {mode === "editor" && bodySections.length === 0 ? (
        <CanvasEmptyState
          locale={locale}
          onAddSection={() => edit?.onRequestInsert?.(null)}
          onBrowseTemplates={
            edit?.onBrowseTemplates
              ? () => edit.onBrowseTemplates?.()
              : undefined
          }
        />
      ) : null}
      {visibleSections.map((section) => {
        const Comp = sectionMap[section.type as keyof typeof sectionMap];
        if (!Comp) return null;
        const body = (
          <div
            className={cn(
              !section.visible && mode === "editor" && "opacity-45",
            )}
            data-section-id={section.id}
            data-section-type={section.type}
            data-section-variant={section.variant || undefined}
            data-visible={section.visible !== false ? "true" : "false"}
          >
            <SectionRenderProvider section={section}>
              <Comp config={view} />
            </SectionRenderProvider>
          </div>
        );
        if (mode !== "editor") return <div key={section.id}>{body}</div>;
        return (
          <EditorSectionFrame
            key={section.id}
            sectionId={section.id}
            label={sectionLabel(section.type, locale)}
            settings={section.settings}
          >
            {body}
          </EditorSectionFrame>
        );
      })}
    </>
  );
}

export function WebsiteRenderer({
  config,
  basePath = "",
  productSlug,
  websiteId,
  mode = "published",
  pageId,
  onProductNavigate,
  onHomeNavigate,
}: {
  config: WebsiteConfig;
  basePath?: string;
  productSlug?: string;
  websiteId?: string;
  mode?: WebsiteRenderMode;
  /** Multi-page preview: home | about | custom page id */
  pageId?: string;
  onProductNavigate?: (slug: string) => void;
  onHomeNavigate?: () => void;
}) {
  const view = polishWebsiteConfig(config);
  const locale = view.settings.language;
  const resolvedPageId = pageId || "home";

  // Custom visual pages: prefer canonical page.sections when present
  if (resolvedPageId !== "home" && resolvedPageId !== "about") {
    const meta = (view.pages ?? []).find((p) => p.id === resolvedPageId) ?? {
      id: resolvedPageId,
      slug: resolvedPageId,
      name: resolvedPageId,
      kind: "custom" as const,
    };
    if (meta.sections && meta.sections.length > 0) {
      return (
        <SiteNavProvider
          value={{
            basePath,
            onProductNavigate,
            onHomeNavigate,
          }}
        >
          <WebsiteShell
            config={view}
            className={cn(
              "vitrin-template",
              `vitrin-template--${view.template}`,
            )}
          >
            <SectionList
              view={view}
              sections={meta.sections}
              mode={mode}
              locale={locale}
            />
          </WebsiteShell>
        </SiteNavProvider>
      );
    }
    return <VisualCustomPagePreview config={view} page={meta} />;
  }

  const visibleSections = view.sections.filter(
    (section) => section.visible || mode === "editor",
  );

  // About page preview: about (+ footer) only — page-aware, still WebsiteRenderer
  if (resolvedPageId === "about" && !productSlug) {
    const aboutPage = (view.pages ?? []).find((p) => p.id === "about");
    const aboutSections =
      aboutPage?.sections && aboutPage.sections.length > 0
        ? aboutPage.sections
        : visibleSections.filter(
            (s) => s.type === "about" || s.type === "footer",
          );
    return (
      <SiteNavProvider
        value={{
          basePath,
          onProductNavigate,
          onHomeNavigate,
        }}
      >
        <WebsiteShell
          config={view}
          className={cn("vitrin-template", `vitrin-template--${view.template}`)}
        >
          {aboutSections.length === 0 ? (
            <AboutSection config={view} />
          ) : (
            <SectionList
              view={view}
              sections={aboutSections}
              mode={mode}
              locale={locale}
            />
          )}
        </WebsiteShell>
      </SiteNavProvider>
    );
  }

  // Product PDP: store templates keep StoreRenderer; others use ProductPageView.
  if (productSlug) {
    return (
      <SiteNavProvider
        value={{
          basePath,
          onProductNavigate,
          onHomeNavigate,
        }}
      >
        {view.template === "store" ? (
          <StoreRenderer
            config={view}
            productSlug={productSlug}
            websiteId={websiteId}
            mode={mode}
          />
        ) : (
          <WebsiteShell
            config={view}
            className={cn(
              "vitrin-template",
              `vitrin-template--${view.template}`,
            )}
          >
            <ProductPageView config={view} productSlug={productSlug} />
          </WebsiteShell>
        )}
      </SiteNavProvider>
    );
  }

  // New template sites: Home via page.sections → shared WebsiteRenderer path.
  if (shouldUseCanonicalHomeRenderer(view)) {
    const homeSections = resolveHomeSections(view);
    return (
      <SiteNavProvider
        value={{
          basePath,
          onProductNavigate,
          onHomeNavigate,
        }}
      >
        <WebsiteShell
          config={view}
          className={cn("vitrin-template", `vitrin-template--${view.template}`)}
        >
          <SectionList
            view={view}
            sections={homeSections}
            mode={mode}
            locale={locale}
          />
        </WebsiteShell>
      </SiteNavProvider>
    );
  }

  // Legacy store sites (no template catalog metadata): StoreRenderer compatibility.
  if (view.template === "store") {
    return (
      <SiteNavProvider
        value={{
          basePath,
          onProductNavigate,
          onHomeNavigate,
        }}
      >
        <StoreRenderer
          config={view}
          productSlug={productSlug}
          websiteId={websiteId}
          mode={mode}
        />
      </SiteNavProvider>
    );
  }

  return (
    <SiteNavProvider
      value={{
        basePath,
        onProductNavigate,
        onHomeNavigate,
      }}
    >
      <WebsiteShell
        config={view}
        className={cn("vitrin-template", `vitrin-template--${view.template}`)}
      >
        <SectionList
          view={view}
          sections={view.sections}
          mode={mode}
          locale={locale}
        />
      </WebsiteShell>
    </SiteNavProvider>
  );
}
