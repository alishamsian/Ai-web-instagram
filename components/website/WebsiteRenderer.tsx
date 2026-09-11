"use client";

import type { WebsiteConfig } from "@/types/website";
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
import { StoreTemplate } from "@/components/store/StoreTemplate";
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
  onProductNavigate,
  onHomeNavigate,
}: {
  config: WebsiteConfig;
  basePath?: string;
  productSlug?: string;
  websiteId?: string;
  onProductNavigate?: (slug: string) => void;
  onHomeNavigate?: () => void;
}) {
  const view = polishWebsiteConfig(config);

  return (
    <SiteNavProvider
      value={{
        basePath,
        onProductNavigate,
        onHomeNavigate,
      }}
    >
      {view.template === "store" ? (
        <StoreTemplate
          config={view}
          productSlug={productSlug}
          websiteId={websiteId}
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
              .filter((section) => section.visible)
              .map((section) => {
                const Comp = sectionMap[section.type as keyof typeof sectionMap];
                if (!Comp) return null;
                return <Comp key={section.id} config={view} />;
              })
          )}
        </WebsiteShell>
      )}
    </SiteNavProvider>
  );
}
