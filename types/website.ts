import type { Product, Service, SEOConfig, ContactInfo } from "./ai";

export type TemplateType =
  | "store"
  | "restaurant"
  | "services"
  | "creator"
  | "portfolio";

export type WebsiteSectionType =
  | "hero"
  | "about"
  | "products"
  | "services"
  | "gallery"
  | "featured-posts"
  | "instagram-feed"
  | "testimonials"
  | "faq"
  | "contact"
  | "location"
  | "social"
  | "cta"
  | "footer";

export interface ColorConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
}

export interface TypographyConfig {
  heading: "serif" | "sans" | "display";
  body: "sans" | "serif";
  scale: "editorial" | "compact" | "bold";
}

export interface HeroConfig {
  style: "editorial" | "split" | "minimal" | "overlay" | "menu";
  headline: string;
  subheadline: string;
  cta: string;
  imageId?: string;
}

export interface AboutConfig {
  title: string;
  body: string;
  imageId?: string;
}

export interface ProductSectionConfig {
  title: string;
  items: Product[];
}

export interface ServiceSectionConfig {
  title: string;
  items: Service[];
}

export interface GalleryConfig {
  title: string;
  imageIds: string[];
}

export interface TestimonialConfig {
  title: string;
  items: { quote: string; author: string }[];
}

export interface FAQConfig {
  title: string;
  items: { question: string; answer: string }[];
}

export interface ContactConfig {
  title: string;
  body: string;
  info: ContactInfo;
}

export interface PromoConfig {
  kicker: string;
  title: string;
  cta: string;
}

export interface TrustConfig {
  items: string[];
}

export interface SectionConfig {
  id: string;
  type: WebsiteSectionType;
  visible: boolean;
}

export interface WebsiteSettings {
  language: "fa" | "en";
  direction: "rtl" | "ltr";
  showBranding: boolean;
  published: boolean;
}

export interface WebsiteConfig {
  template: TemplateType;
  brand: {
    name: string;
    logo?: string;
    tagline?: string;
    colors: ColorConfig;
    typography: TypographyConfig;
  };
  content: {
    hero: HeroConfig;
    about?: AboutConfig;
    products?: ProductSectionConfig;
    services?: ServiceSectionConfig;
    gallery?: GalleryConfig;
    testimonials?: TestimonialConfig;
    faq?: FAQConfig;
    contact?: ContactConfig;
    promo?: PromoConfig;
    trust?: TrustConfig;
  };
  sections: SectionConfig[];
  seo: SEOConfig;
  settings: WebsiteSettings;
  media: Record<
    string,
    { url: string; alt: string; type: "image" | "video"; videoUrl?: string | null }
  >;
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
}

export interface WebsiteVersion {
  id: string;
  websiteId: string;
  version: number;
  config: WebsiteConfig;
  createdAt: string;
}

export interface DomainRecord {
  id: string;
  websiteId: string;
  host: string;
  createdAt: string;
}
