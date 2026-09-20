/**
 * Phase 3 product-owned full-site template types.
 * Templates instantiate into WebsiteConfig — they are not a second website schema.
 */

import type {
  BrandDesignConfig,
  ColorConfig,
  TemplateType,
  TypographyConfig,
  WebsiteConfig,
  WebsitePageKind,
  WebsiteSectionType,
} from "@/types/website";

export const TEMPLATE_SCHEMA_VERSION = 1;

export type TemplateCategory =
  | "fashion"
  | "restaurant"
  | "saas"
  | "agency"
  | "beauty"
  | "jewelry"
  | "furniture"
  | "real-estate"
  | "healthcare"
  | "fitness"
  | "creator"
  | "portfolio"
  | "photography"
  | "education"
  | "legal"
  | "automotive"
  | "coffee"
  | "hotel"
  | "travel"
  | "general";

export type TemplateStyle =
  | "minimal"
  | "editorial"
  | "luxury"
  | "modern"
  | "bold"
  | "elegant"
  | "playful"
  | "corporate"
  | "organic"
  | "dark"
  | "light";

export type TemplateFeature =
  | "ecommerce"
  | "blog"
  | "booking"
  | "portfolio"
  | "contact-form"
  | "gallery"
  | "testimonials"
  | "pricing"
  | "menu"
  | "lookbook";

export type TemplateBrandPreset = {
  colors: ColorConfig;
  typography: TypographyConfig;
  design?: BrandDesignConfig;
  tagline?: string;
};

export type LocalizedText = string | { fa: string; en: string };

export type TemplateSectionDef = {
  /** Stable key within the page (e.g. "hero", "cta"). */
  key: string;
  /** Visual registry block id, e.g. "section-hero". */
  blockId: string;
  variant?: string;
  /** Optional content role → text for create-time merge (bilingual preferred). */
  content?: Record<string, LocalizedText>;
  /** Maps to WebsiteConfig content paths when on home (optional). */
  canonical?: boolean;
};

export type TemplatePageDef = {
  /** Stable template page id (home, about, shop, …). */
  id: string;
  slug: string;
  name: { fa: string; en: string };
  kind: WebsitePageKind;
  title?: { fa: string; en: string };
  description?: { fa: string; en: string };
  sections: TemplateSectionDef[];
};

export type TemplateNavItem = {
  /** References TemplatePageDef.id */
  pageId: string;
  label: { fa: string; en: string };
};

export type WebsiteTemplate = {
  id: string;
  schemaVersion: number;
  name: { fa: string; en: string };
  slug: string;
  description: { fa: string; en: string };
  category: TemplateCategory;
  style: TemplateStyle;
  tags: string[];
  features: TemplateFeature[];
  /** Closest legacy TemplateType for Classic / WebsiteRenderer family. */
  legacyTemplate: TemplateType;
  brand: TemplateBrandPreset;
  pages: TemplatePageDef[];
  navigation: TemplateNavItem[];
  metadata?: {
    industry?: string;
    audience?: string;
    businessTypes?: string[];
  };
  thumbnail?: string;
};

export type InstantiateTemplateOptions = {
  locale?: "fa" | "en";
  brandName?: string;
  language?: "fa" | "en";
  direction?: "rtl" | "ltr";
};

export type InstantiateTemplateResult = {
  config: WebsiteConfig;
  /** template page id → website page id */
  pageIdMap: Record<string, string>;
  templateId: string;
};

/** Lightweight catalog card — no GrapesJS / full config. */
export type TemplateCatalogItem = {
  id: string;
  slug: string;
  name: { fa: string; en: string };
  description: { fa: string; en: string };
  category: TemplateCategory;
  style: TemplateStyle;
  tags: string[];
  features: TemplateFeature[];
  pageCount: number;
  thumbnail?: string;
  legacyTemplate: TemplateType;
};

export type TemplateFilter = {
  category?: TemplateCategory | "all";
  style?: TemplateStyle | "all";
  feature?: TemplateFeature;
  query?: string;
  tag?: string;
};

/** Resolve registry block id → WebsiteSectionType when applicable. */
export function sectionTypeFromBlockId(
  blockId: string,
): WebsiteSectionType | undefined {
  if (!blockId.startsWith("section-")) return undefined;
  return blockId.slice("section-".length) as WebsiteSectionType;
}
