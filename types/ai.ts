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
}

export interface AIAnalyzer {
  analyzeImport(input: {
    profile: import("./instagram").InstagramProfile;
    posts: import("./instagram").InstagramPost[];
    locale: "fa" | "en";
  }): Promise<WebsiteAIAnalysis>;
}
