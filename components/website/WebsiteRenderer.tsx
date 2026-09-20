"use client";

import type { WebsiteConfig } from "@/types/website";
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
import { ProductPageView } from "@/components/website/ProductPage";
import { WebsiteShell } from "@/components/website/shell";
import { SiteNavProvider } from "@/components/website/SiteNavContext";
import { StoreRenderer } from "@/components/store/StoreRenderer";
import { EditorSectionFrame } from "@/components/editor/EditorSectionFrame";
import { CanvasEmptyState } from "@/components/editor/CanvasEmptyState";
import { useEditorEdit } from "@/components/editor/EditContext";
import { sectionLabel } from "@/components/editor/editor-utils";
import { polishWebsiteConfig } from "@/lib/website/polish";
import { cn } from "@/lib/utils";
import { VisualCustomPagePreview } from "@/components/visual-editor/VisualCustomPagePreview";

const sectionMap = {
  hero: HeroSection,
  about: AboutSection,
  products: ProductsSection,
  services: ServicesSection,
  gallery: GallerySection,
  "instagram-feed": GallerySection,
  "featured-posts": GallerySection,
  testimonials: TestimonialsSection,
  faq: FAQSiteSection,
  contact: ContactSection,
  footer: FooterSection,
};

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
  const edit = useEditorEdit();
  const resolvedPageId = pageId || "home";

  // Custom visual pages: preview projection HTML (not GrapesJS canvas)
  if (resolvedPageId !== "home" && resolvedPageId !== "about") {
    const meta = (view.pages ?? []).find((p) => p.id === resolvedPageId) ?? {
      id: resolvedPageId,
      slug: resolvedPageId,
      name: resolvedPageId,
      kind: "custom" as const,
    };
    return <VisualCustomPagePreview config={view} page={meta} />;
  }

  const visibleSections = view.sections.filter(
    (section) => section.visible || mode === "editor",
  );

  // About page preview: about (+ footer) only — page-aware, still WebsiteRenderer
  if (resolvedPageId === "about" && !productSlug) {
    const aboutSections = visibleSections.filter(
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
            aboutSections.map((section) => {
              const Comp = sectionMap[section.type as keyof typeof sectionMap];
              if (!Comp) return null;
              return (
                <div key={section.id}>
                  <Comp config={view} />
                </div>
              );
            })
          )}
        </WebsiteShell>
      </SiteNavProvider>
    );
  }

  const bodySections = visibleSections.filter((s) => s.type !== "footer");

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
          className={cn("vitrin-template", `vitrin-template--${view.template}`)}
        >
          {productSlug ? (
            <ProductPageView config={view} productSlug={productSlug} />
          ) : (
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
                  >
                    <Comp config={view} />
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
          )}
        </WebsiteShell>
      )}
    </SiteNavProvider>
  );
}
