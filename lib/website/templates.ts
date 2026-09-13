import type { TemplateType, WebsiteConfig, WebsiteSectionType } from "@/types/website";

export interface TemplateDefinition {
  id: TemplateType;
  name: { fa: string; en: string };
  description: { fa: string; en: string };
  sections: WebsiteSectionType[];
  typography: WebsiteConfig["brand"]["typography"];
  heroStyle: WebsiteConfig["content"]["hero"]["style"];
}

export const templates: Record<TemplateType, TemplateDefinition> = {
  store: {
    id: "store",
    name: { fa: "فروشگاه", en: "Store" },
    description: {
      fa: "برای پوشاک، لوازم و فروشگاه‌های محلی.",
      en: "For fashion, goods, and local shops.",
    },
    sections: [
      "hero",
      "categories",
      "featured-products",
      "product-spotlight",
      "products",
      "bestsellers",
      "about",
      "gallery",
      "faq",
      "contact",
      "cta",
      "footer",
    ],
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    heroStyle: "overlay",
  },
  restaurant: {
    id: "restaurant",
    name: { fa: "رستوران", en: "Restaurant" },
    description: {
      fa: "برای کافه، نانوایی و فضای غذایی.",
      en: "For cafes, bakeries, and restaurants.",
    },
    sections: ["hero", "products", "about", "gallery", "faq", "contact", "footer"],
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    heroStyle: "overlay",
  },
  services: {
    id: "services",
    name: { fa: "خدمات", en: "Services" },
    description: {
      fa: "برای سالن، آژانس و خدمات محلی.",
      en: "For salons, agencies, and local services.",
    },
    sections: ["hero", "products", "services", "about", "faq", "contact", "footer"],
    typography: { heading: "sans", body: "sans", scale: "compact" },
    heroStyle: "split",
  },
  creator: {
    id: "creator",
    name: { fa: "کرییتور", en: "Creator" },
    description: {
      fa: "برای اینفلوئنسر، عکاس و هنرمند.",
      en: "For influencers, photographers, and artists.",
    },
    sections: ["hero", "products", "gallery", "about", "contact", "footer"],
    typography: { heading: "display", body: "sans", scale: "bold" },
    heroStyle: "minimal",
  },
  portfolio: {
    id: "portfolio",
    name: { fa: "نمونه‌کار", en: "Portfolio" },
    description: {
      fa: "برای طراح، فریلنسر و متخصص.",
      en: "For designers, freelancers, and professionals.",
    },
    sections: ["hero", "products", "gallery", "about", "services", "contact", "footer"],
    typography: { heading: "sans", body: "sans", scale: "compact" },
    heroStyle: "split",
  },
};

export const templateOrder: TemplateType[] = [
  "store",
  "restaurant",
  "services",
  "creator",
  "portfolio",
];
