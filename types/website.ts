import type { Product, Service, SEOConfig, ContactInfo } from "./ai";

export type TemplateType =
  | "store"
  | "restaurant"
  | "services"
  | "creator"
  | "portfolio";

export type WebsiteSectionType =
  | "hero" | "about" | "products" | "services" | "gallery" | "featured-posts"
  | "featured-products" | "categories" | "product-spotlight" | "bestsellers" | "instagram-feed"
  | "testimonials" | "trust" | "faq" | "contact" | "location" | "social" | "cta" | "promo" | "footer"
  | "shop-by-concern" | "shop-by-skin-type" | "routine" | "ingredient-story" | "product-finder"
  | "lookbook" | "shop-the-look" | "collection-story" | "style-guide" | "designer-spotlight" | "fit-guide"
  | "shop-by-material" | "shop-by-occasion" | "stack-builder" | "jewelry-care"
  | "origin-explorer" | "flavor-profile" | "brew-guide" | "roaster-story" | "subscription" | "coffee-finder"
  | "shop-by-room" | "shop-by-designer" | "materials" | "dimensions" | "projects" | "room-inspiration";

export interface ColorConfig { primary: string; secondary: string; accent: string; background: string; foreground: string; muted: string; }
export interface TypographyConfig { heading: "serif" | "sans" | "display"; body: "sans" | "serif"; scale: "editorial" | "compact" | "bold"; }
export type DesignContentWidth = "narrow" | "default" | "wide";
export type DesignSectionSpacing = "compact" | "comfortable" | "spacious";
export type DesignRadius = "sharp" | "soft" | "rounded";
export type DesignShadow = "none" | "subtle" | "elevated";
export interface BrandDesignConfig { contentWidth?: DesignContentWidth; sectionSpacing?: DesignSectionSpacing; radius?: DesignRadius; shadow?: DesignShadow; }
export interface HeroConfig { style: "editorial" | "split" | "minimal" | "overlay" | "menu" | "fan"; headline: string; subheadline: string; cta: string; ctaHref?: string; imageId?: string; }
export interface AboutConfig { title: string; body: string; imageId?: string; }
export interface ProductSectionConfig { title: string; items: Product[]; defaults?: { category?: string; currency?: string | null; }; }
export interface ServiceSectionConfig { title: string; items: Service[]; }
export interface GalleryConfig { title: string; imageIds: string[]; }
export interface TestimonialItem { id?: string; quote: string; author: string; }
export interface TestimonialConfig { title: string; items: TestimonialItem[]; }
export interface FaqItem { id?: string; question: string; answer: string; }
export interface FAQConfig { title: string; items: FaqItem[]; }
export interface ContactConfig { title: string; body: string; info: ContactInfo; }
export interface PromoConfig { kicker: string; title: string; cta: string; ctaHref?: string; }
export interface TrustConfig { items: string[]; }
export interface SectionConfig { id: string; type: WebsiteSectionType; visible: boolean; variant?: string; settings?: Record<string, unknown>; }

export type WebsiteThemeMode = "light" | "dark" | "system";
export interface WebsiteSettings {
  language: "fa" | "en";
  direction: "rtl" | "ltr";
  showBranding: boolean;
  published: boolean;
  vertical?: string | null;
  recipeId?: string | null;
  mood?: string | null;
  /** Theme intent only; renderers should consume semantic color tokens. */
  themeMode?: WebsiteThemeMode;
}

export interface WebsiteConfig {
  template: TemplateType;
  brand: { name: string; logo?: string; tagline?: string; colors: ColorConfig; typography: TypographyConfig; design?: BrandDesignConfig; };
  content: { hero: HeroConfig; about?: AboutConfig; products?: ProductSectionConfig; services?: ServiceSectionConfig; gallery?: GalleryConfig; testimonials?: TestimonialConfig; faq?: FAQConfig; contact?: ContactConfig; promo?: PromoConfig; trust?: TrustConfig; };
  sections: SectionConfig[];
  seo: SEOConfig;
  settings: WebsiteSettings;
  media: Record<string, { url: string; alt: string; type: "image" | "video"; videoUrl?: string | null }>;
}
export interface WebsiteRecord {
  id: string;
  workspaceId: string;
  importId: string;
  slug: string;
  config: WebsiteConfig;
  status: "draft" | "published" | "unpublished";
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  /** Soft-delete timestamp — product queries exclude when set. */
  deletedAt?: string | null;
}
export interface WebsiteVersion { id: string; websiteId: string; version: number; config: WebsiteConfig; createdAt: string; }
export interface DomainRecord { id: string; websiteId: string; host: string; createdAt: string; }
