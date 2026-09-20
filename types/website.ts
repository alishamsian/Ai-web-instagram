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
  | "columns"
  | "shop-by-concern" | "shop-by-skin-type" | "routine" | "ingredient-story" | "product-finder"
  | "lookbook" | "shop-the-look" | "collection-story" | "style-guide" | "designer-spotlight" | "fit-guide"
  | "shop-by-material" | "shop-by-occasion" | "stack-builder" | "jewelry-care"
  | "origin-explorer" | "flavor-profile" | "brew-guide" | "roaster-story" | "subscription" | "coffee-finder"
  | "shop-by-room" | "shop-by-designer" | "materials" | "dimensions" | "projects" | "room-inspiration"
  /** Phase 3.1 canonical sections */
  | "pricing" | "menu" | "portfolio" | "properties" | "reservations";

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

/** Phase 3.1 — lookbook items with stable identity (not array index). */
export interface LookbookItem {
  id: string;
  imageId: string;
  caption?: string;
  href?: string;
}
export interface LookbookConfig {
  title: string;
  description?: string;
  items: LookbookItem[];
}

export interface ShopTheLookItem {
  id: string;
  title: string;
  description?: string;
  imageId?: string;
  /** Stable product ids — references content.products.items[].id */
  productIds: string[];
  href?: string;
}
export interface ShopTheLookConfig {
  title: string;
  description?: string;
  items: ShopTheLookItem[];
}

export interface CategoryItem {
  id: string;
  title: string;
  slug: string;
  imageId?: string;
  href?: string;
}
export interface CategoriesConfig {
  title: string;
  items: CategoryItem[];
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}
export interface PricingConfig {
  title: string;
  description?: string;
  plans: PricingPlan[];
}

export interface MenuCategory {
  id: string;
  title: string;
}
export interface MenuItem {
  id: string;
  title: string;
  description?: string;
  price?: string;
  imageId?: string;
  categoryId?: string;
}
export interface MenuConfig {
  title: string;
  description?: string;
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface LocationConfig {
  title: string;
  address?: string;
  city?: string;
  hours?: string;
  phone?: string;
  /** Sanitized https URL only — never raw iframe HTML. */
  mapUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageId?: string;
  tag?: string;
  href?: string;
}
export interface PortfolioConfig {
  title: string;
  description?: string;
  items: PortfolioItem[];
}

export interface PropertyItem {
  id: string;
  title: string;
  location?: string;
  price?: string;
  description?: string;
  imageId?: string;
  href?: string;
}
export interface PropertiesConfig {
  title: string;
  description?: string;
  items: PropertyItem[];
}

export interface WebsiteContent {
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
  /** Phase 3.1 canonical collections — optional for legacy sites. */
  lookbook?: LookbookConfig;
  shopTheLook?: ShopTheLookConfig;
  categories?: CategoriesConfig;
  pricing?: PricingConfig;
  menu?: MenuConfig;
  location?: LocationConfig;
  portfolio?: PortfolioConfig;
  properties?: PropertiesConfig;
}

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
  content: WebsiteContent;
  sections: SectionConfig[];
  seo: SEOConfig;
  settings: WebsiteSettings;
  media: Record<string, { url: string; alt: string; type: "image" | "video"; videoUrl?: string | null }>;
  /**
   * Site page metadata for the multi-page visual builder.
   * Ordering is array order; identity is `id` (never array index).
   * Classic Editor ignores this field; WebsiteRenderer uses it for page-aware preview.
   * GrapesJS page trees remain under visualEditor.project (projection only).
   */
  pages?: WebsitePage[];
  /**
   * GrapesJS visual-editor projection (optional).
   * Classic Editor / WebsiteRenderer ignore this field.
   * Canonical product model remains the rest of WebsiteConfig.
   */
  visualEditor?: VisualEditorState;
  /**
   * Phase 3 full-site template provenance (optional).
   * Absent on pre-Phase-3 / Instagram-imported sites — that is valid.
   * Does NOT replace `template` (legacy TemplateType for Classic family).
   */
  templateCatalogId?: string;
  templateSchemaVersion?: number;
}

/** Stable multi-page identity (Phase 2.2). Reserved: home, about. */
export type WebsitePageKind = "home" | "about" | "custom";

export interface WebsitePage {
  id: string;
  slug: string;
  name: string;
  title?: string;
  description?: string;
  kind: WebsitePageKind;
  /**
   * Page-local section list (Phase 3.1).
   * Home also mirrors into WebsiteConfig.sections for Classic compatibility.
   * Custom pages render from this list when present (canonical path),
   * otherwise fall back to visual projection HTML.
   */
  sections?: SectionConfig[];
}

/** Persisted GrapesJS project JSON + metadata. Unknown keys must survive round-trips. */
export type VisualEditorProjectData = Record<string, unknown>;

/**
 * GrapesJS visual-editor projection state.
 * - version 1: Phase 1 foundation
 * - version 2: Phase 2 stable IDs + source fingerprint reconcile
 */
export interface VisualEditorState {
  engine: "grapesjs";
  version: 1 | 2;
  project: VisualEditorProjectData;
  activePageId?: string;
  /**
   * Fingerprint of content/sections/media at last visual sync.
   * When this drifts from live WebsiteConfig, reserved pages are rebuilt.
   */
  sourceFingerprint?: string;
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
export interface DomainRecord {
  id: string;
  websiteId: string;
  host: string;
  createdAt: string;
  /** Set when DNS/ownership is confirmed. Unverified hosts must not route. */
  verifiedAt?: string | null;
}

