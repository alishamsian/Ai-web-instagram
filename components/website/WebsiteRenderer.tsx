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
import { sectionLabel } from "@/components/editor/editor-utils";
import { polishWebsiteConfig } from "@/lib/website/polish";
import { cn } from "@/lib/utils";

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
  onProductNavigate,
  onHomeNavigate,
}: {
  config: WebsiteConfig;
  basePath?: string;
  productSlug?: string;
  websiteId?: string;
  mode?: WebsiteRenderMode;
  onProductNavigate?: (slug: string) => void;
  onHomeNavigate?: () => void;
}) {
  const view = polishWebsiteConfig(config);
  const locale = view.settings.language;

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
            view.sections
              .filter((section) => section.visible || mode === "editor")
              .map((section) => {
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
              })
          )}
        </WebsiteShell>
      )}
    </SiteNavProvider>
  );
}
