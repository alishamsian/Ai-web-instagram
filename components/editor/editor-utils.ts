import type { ColorConfig, TemplateType, WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { templates } from "@/lib/website/templates";

export type EditorTab =
  | "brand"
  | "colors"
  | "type"
  | "layout"
  | "content"
  | "media"
  | "sections"
  | "seo"
  | "settings"
  | "template"
  | "versions";

export const COLOR_PRESETS: {
  id: string;
  label: { fa: string; en: string };
  colors: ColorConfig;
}[] = [
  {
    id: "ink",
    label: { fa: "مرکب", en: "Ink" },
    colors: {
      primary: "#111111",
      secondary: "#FFFFFF",
      accent: "#2A2A2A",
      background: "#FAFAFA",
      foreground: "#111111",
      muted: "#EEEEEE",
    },
  },
  {
    id: "noir",
    label: { fa: "نوآر", en: "Noir" },
    colors: {
      primary: "#F5F5F5",
      secondary: "#0A0A0A",
      accent: "#D4A373",
      background: "#0A0A0A",
      foreground: "#F5F5F5",
      muted: "#1A1A1A",
    },
  },
  {
    id: "atelier",
    label: { fa: "آتلیه", en: "Atelier" },
    colors: {
      primary: "#1C1917",
      secondary: "#F7F3EE",
      accent: "#A67C52",
      background: "#F7F3EE",
      foreground: "#1C1917",
      muted: "#EDE7DF",
    },
  },
  {
    id: "coast",
    label: { fa: "ساحل", en: "Coast" },
    colors: {
      primary: "#0F172A",
      secondary: "#F8FAFC",
      accent: "#0F766E",
      background: "#F8FAFC",
      foreground: "#0F172A",
      muted: "#E2E8F0",
    },
  },
  {
    id: "bloom",
    label: { fa: "بلوم", en: "Bloom" },
    colors: {
      primary: "#1F1A17",
      secondary: "#FFF8F5",
      accent: "#C45C4A",
      background: "#FFF8F5",
      foreground: "#1F1A17",
      muted: "#F3E8E3",
    },
  },
];

export function sectionLabel(type: WebsiteSectionType, locale: Locale): string {
  const map: Record<string, { fa: string; en: string }> = {
    hero: { fa: "هیرو", en: "Hero" },
    about: { fa: "درباره", en: "About" },
    products: { fa: "محصولات", en: "Products" },
    services: { fa: "خدمات", en: "Services" },
    gallery: { fa: "گالری", en: "Gallery" },
    "featured-posts": { fa: "پست‌های ویژه", en: "Featured" },
    "instagram-feed": { fa: "فید اینستا", en: "Instagram" },
    testimonials: { fa: "نظرات", en: "Testimonials" },
    faq: { fa: "پرسش‌ها", en: "FAQ" },
    contact: { fa: "تماس", en: "Contact" },
    location: { fa: "موقعیت", en: "Location" },
    social: { fa: "شبکه‌ها", en: "Social" },
    cta: { fa: "فراخوان", en: "CTA" },
    footer: { fa: "فوتر", en: "Footer" },
  };
  return map[type]?.[locale] ?? type;
}

export function cloneConfig(config: WebsiteConfig): WebsiteConfig {
  return structuredClone(config);
}

export function configsEqual(a: WebsiteConfig, b: WebsiteConfig) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function editorTabs(dict: Dictionary): { id: EditorTab; label: string }[] {
  return [
    { id: "brand", label: dict.editor.brand },
    { id: "colors", label: dict.editor.colors },
    { id: "type", label: dict.editor.typography },
    { id: "layout", label: dict.editor.layout },
    { id: "content", label: dict.editor.content },
    { id: "media", label: dict.editor.media },
    { id: "sections", label: dict.editor.sections },
    { id: "seo", label: dict.editor.seo },
    { id: "settings", label: dict.editor.settings },
    { id: "template", label: dict.editor.template },
    { id: "versions", label: dict.editor.versions },
  ];
}

export function mediaEntries(config: WebsiteConfig) {
  return Object.entries(config.media).filter(([, item]) => item.type === "image");
}

export function applyTemplate(
  config: WebsiteConfig,
  templateId: TemplateType,
): WebsiteConfig {
  const def = templates[templateId];
  const existing = new Map(config.sections.map((s) => [s.type, s]));
  const sections = def.sections.map((type) => {
    const prev = existing.get(type);
    return {
      id: prev?.id ?? `${type}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      visible: prev?.visible ?? true,
    };
  });

  for (const section of config.sections) {
    if (!sections.some((s) => s.type === section.type)) {
      sections.push({ ...section, visible: false });
    }
  }

  return {
    ...config,
    template: templateId,
    brand: {
      ...config.brand,
      typography: { ...def.typography },
    },
    content: {
      ...config.content,
      hero: { ...config.content.hero, style: def.heroStyle },
      testimonials:
        config.content.testimonials ??
        (templateId === "creator" || templateId === "services"
          ? {
              title: config.settings.language === "fa" ? "نظر مشتریان" : "What clients say",
              items: [],
            }
          : config.content.testimonials),
    },
    sections,
  };
}

export function ensureTestimonials(config: WebsiteConfig): WebsiteConfig {
  if (config.content.testimonials) return config;
  return {
    ...config,
    content: {
      ...config.content,
      testimonials: {
        title: config.settings.language === "fa" ? "نظر مشتریان" : "What clients say",
        items: [],
      },
    },
  };
}

export function ensureSectionContent(
  config: WebsiteConfig,
  type: WebsiteSectionType,
): WebsiteConfig {
  const locale = config.settings.language;
  const next = structuredClone(config);
  switch (type) {
    case "about":
      next.content.about ??= {
        title: locale === "fa" ? "داستان برند" : "Our story",
        body:
          locale === "fa"
            ? "چند خط درباره برند بنویس."
            : "Write a short brand story.",
      };
      break;
    case "products":
      next.content.products ??= {
        title: locale === "fa" ? "محصولات" : "Products",
        items: [],
      };
      break;
    case "services":
      next.content.services ??= {
        title: locale === "fa" ? "خدمات" : "Services",
        items: [],
      };
      break;
    case "gallery":
    case "instagram-feed":
    case "featured-posts":
      next.content.gallery ??= {
        title: locale === "fa" ? "گالری" : "Gallery",
        imageIds: [],
      };
      break;
    case "testimonials":
      return ensureTestimonials(next);
    case "faq":
      next.content.faq ??= {
        title: locale === "fa" ? "پرسش‌ها" : "FAQ",
        items: [],
      };
      break;
    case "contact":
      next.content.contact ??= {
        title: locale === "fa" ? "تماس" : "Contact",
        body: "",
        info: {
          phone: null,
          email: null,
          website: null,
          instagram: null,
          telegram: null,
          whatsapp: null,
          address: null,
          location: null,
        },
      };
      break;
    case "cta":
      next.content.promo ??= {
        kicker: locale === "fa" ? "ویژه" : "Featured",
        title: locale === "fa" ? "همین حالا خرید کن" : "Shop the collection",
        cta: locale === "fa" ? "مشاهده" : "Shop now",
      };
      break;
    default:
      break;
  }
  return next;
}

export function addOrShowSection(
  config: WebsiteConfig,
  type: WebsiteSectionType,
): WebsiteConfig {
  const withContent = ensureSectionContent(config, type);
  const existing = withContent.sections.find((s) => s.type === type);
  if (existing) {
    return {
      ...withContent,
      sections: withContent.sections.map((s) =>
        s.type === type ? { ...s, visible: true } : s,
      ),
    };
  }
  const section = {
    id: `${type}-${Date.now().toString(36)}`,
    type,
    visible: true,
  };
  const withoutFooter = withContent.sections.filter((s) => s.type !== "footer");
  const footer = withContent.sections.filter((s) => s.type === "footer");
  return {
    ...withContent,
    sections:
      type === "footer"
        ? [...withContent.sections, section]
        : [...withoutFooter, section, ...footer],
  };
}
