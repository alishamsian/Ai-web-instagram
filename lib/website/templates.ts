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
    name: { fa: "فروشگاه", en: "Commerce" },
    description: {
      fa: "فروشگاه حرفه‌ای با هیرو، دسته و محصولات.",
      en: "Professional shop with hero, categories, and products.",
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
      fa: "منو، گالری و تماس برای فضای غذایی.",
      en: "Menu, gallery, and contact for food spaces.",
    },
    sections: ["hero", "products", "about", "gallery", "faq", "contact", "footer"],
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    heroStyle: "overlay",
  },
  services: {
    id: "services",
    name: { fa: "آژانس", en: "Agency" },
    description: {
      fa: "خدمات، نمونه‌کار و CTA برای آژانس یا مشاور.",
      en: "Services, proof, and CTA for agencies or consultants.",
    },
    sections: ["hero", "products", "services", "about", "faq", "contact", "footer"],
    typography: { heading: "sans", body: "sans", scale: "compact" },
    heroStyle: "split",
  },
  creator: {
    id: "creator",
    name: { fa: "استودیو خلاق", en: "Creative Studio" },
    description: {
      fa: "گالری و داستان برند برای کرییتور و استودیو.",
      en: "Gallery-led story for creators and studios.",
    },
    sections: ["hero", "products", "gallery", "about", "contact", "footer"],
    typography: { heading: "display", body: "sans", scale: "bold" },
    heroStyle: "minimal",
  },
  portfolio: {
    id: "portfolio",
    name: { fa: "پورتفولیو", en: "Personal Portfolio" },
    description: {
      fa: "نمونه‌کار تمیز برای طراح و فریلنسر.",
      en: "Clean work showcase for designers and freelancers.",
    },
    sections: ["hero", "products", "gallery", "about", "services", "contact", "footer"],
    typography: { heading: "sans", body: "sans", scale: "compact" },
    heroStyle: "split",
  },
};

export const templateOrder: TemplateType[] = [
  "portfolio",
  "creator",
  "services",
  "store",
  "restaurant",
];
