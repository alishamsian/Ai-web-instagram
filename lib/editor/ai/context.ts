/**
 * Compact, non-sensitive context for AI co-designer.
 * Never includes secrets, auth, payment, or private backend IDs.
 */

import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type { ViewportBucket } from "@/lib/editor/responsive";

export type AiEditorContext = {
  locale: "fa" | "en";
  viewport: ViewportBucket;
  template: string;
  vertical: string | null;
  brand: {
    name: string;
    colors: WebsiteConfig["brand"]["colors"];
    typography: WebsiteConfig["brand"]["typography"];
  };
  sections: Array<{
    id: string;
    type: string;
    visible: boolean;
    variant?: string;
  }>;
  selectedSection: {
    id: string;
    type: string;
    visible: boolean;
    variant?: string;
    settings?: Record<string, unknown>;
    relevantContent?: Record<string, unknown>;
  } | null;
  contentHints: {
    hero?: {
      headline: string;
      subheadline: string;
      cta: string;
    };
    aboutTitle?: string;
    productsTitle?: string;
    servicesTitle?: string;
    testimonialsTitle?: string;
    faqTitle?: string;
  };
};

function contentForSectionType(
  config: WebsiteConfig,
  type: string,
): Record<string, unknown> | undefined {
  const c = config.content;
  switch (type) {
    case "hero":
      return {
        headline: c.hero.headline,
        subheadline: c.hero.subheadline,
        cta: c.hero.cta,
        style: c.hero.style,
      };
    case "about":
      return c.about
        ? { title: c.about.title, body: c.about.body?.slice(0, 400) }
        : undefined;
    case "products":
    case "featured-products":
    case "bestsellers":
      return c.products
        ? {
            title: c.products.title,
            itemCount: c.products.items?.length ?? 0,
          }
        : undefined;
    case "services":
      return c.services
        ? {
            title: c.services.title,
            itemCount: c.services.items?.length ?? 0,
          }
        : undefined;
    case "testimonials":
      return c.testimonials
        ? {
            title: c.testimonials.title,
            itemCount: c.testimonials.items?.length ?? 0,
          }
        : undefined;
    case "faq":
      return c.faq
        ? { title: c.faq.title, itemCount: c.faq.items?.length ?? 0 }
        : undefined;
    case "gallery":
      return c.gallery
        ? {
            title: c.gallery.title,
            imageCount: c.gallery.imageIds?.length ?? 0,
          }
        : undefined;
    case "contact":
      return c.contact
        ? { title: c.contact.title, body: c.contact.body?.slice(0, 200) }
        : undefined;
    case "promo":
      return c.promo
        ? {
            kicker: c.promo.kicker,
            title: c.promo.title,
            cta: c.promo.cta,
          }
        : undefined;
    default:
      return undefined;
  }
}

function sanitizeSettings(
  settings: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!settings) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("price") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("password")
    ) {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function buildAiEditorContext(params: {
  config: WebsiteConfig;
  selectedSectionId?: string | null;
  viewport?: ViewportBucket;
  locale?: "fa" | "en";
}): AiEditorContext {
  const { config } = params;
  const locale = params.locale ?? config.settings.language ?? "fa";
  const selected: SectionConfig | null =
    params.selectedSectionId != null
      ? (config.sections.find((s) => s.id === params.selectedSectionId) ?? null)
      : null;

  return {
    locale,
    viewport: params.viewport ?? "desktop",
    template: config.template,
    vertical: config.settings.vertical ?? null,
    brand: {
      name: config.brand.name,
      colors: { ...config.brand.colors },
      typography: { ...config.brand.typography },
    },
    sections: config.sections.map((s) => ({
      id: s.id,
      type: s.type,
      visible: s.visible !== false,
      variant: s.variant,
    })),
    selectedSection: selected
      ? {
          id: selected.id,
          type: selected.type,
          visible: selected.visible !== false,
          variant: selected.variant,
          settings: sanitizeSettings(selected.settings),
          relevantContent: contentForSectionType(config, selected.type),
        }
      : null,
    contentHints: {
      hero: {
        headline: config.content.hero.headline,
        subheadline: config.content.hero.subheadline,
        cta: config.content.hero.cta,
      },
      aboutTitle: config.content.about?.title,
      productsTitle: config.content.products?.title,
      servicesTitle: config.content.services?.title,
      testimonialsTitle: config.content.testimonials?.title,
      faqTitle: config.content.faq?.title,
    },
  };
}
