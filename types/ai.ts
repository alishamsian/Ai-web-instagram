import type { WebsiteSectionType } from "./website";

export interface Product {
  id?: string;
  slug?: string;
  name: string;
  description: string;
  category: string;
  price: number | null;
  currency: string | null;
  imageIds: string[];
  confidence: number;
  /** When true, product is hidden from the public storefront. */
  hidden?: boolean;
  /**
   * Vertical-specific attributes — does not pollute generic ecommerce fields.
   * Schema comes from VerticalPack.productAttributes; values live here.
   */
  industryData?: ProductIndustryData;
}

/** Extensible industry payload keyed by vertical attribute definitions. */
export interface ProductIndustryData {
  vertical?: string;
  attributes?: Record<
    string,
    string | number | boolean | string[] | null | undefined
  >;
}

export interface Service {
  name: string;
  description: string;
  imageIds: string[];
  confidence: number;
}

export interface ContactInfo {
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  telegram: string | null;
  whatsapp: string | null;
  address: string | null;
  location: string | null;
}

export interface SEOConfig {
  title: string;
  description: string;
  keywords: string[];
}

/**
 * Optional Vertical Engine profile attached by future AI classification.
 * Absent today — consumers must treat as unknown, not invent values.
 */
export interface WebsiteBusinessProfile {
  vertical?: string | null;
  subVertical?: string | null;
  style?: string | null;
  confidence?: number | null;
  recommendedTemplate?: string | null;
  recommendedModules?: string[];
  productAttributes?: string[];
  fallbackVertical?: string | null;
  mood?: string | null;
}

export interface WebsiteAIAnalysis {
  businessType: string;
  businessName: string;
  summary: string;
  targetAudience: string;
  brandTone: string[];
  visualStyle: string[];
  suggestedColors: string[];
  products: Product[];
  services: Service[];
  contactInfo: ContactInfo;
  recommendedSections: WebsiteSectionType[];
  suggestedCTA: string;
  seo: SEOConfig;
  template: import("./website").TemplateType;
  heroCopy: {
    headline: string;
    subheadline: string;
  };
  aboutCopy: string;
  /** Vertical Engine seam — optional until Instagram classification lands. */
  businessProfile?: WebsiteBusinessProfile;
}

export interface AIAnalyzer {
  analyzeImport(input: {
    profile: import("./instagram").InstagramProfile;
    posts: import("./instagram").InstagramPost[];
    locale: "fa" | "en";
  }): Promise<WebsiteAIAnalysis>;
}
