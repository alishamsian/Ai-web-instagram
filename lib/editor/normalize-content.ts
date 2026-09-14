/**
 * Soft identity / legacy normalization for WebsiteConfig content collections.
 * Pure and idempotent — safe to run repeatedly on editor/preview/published data.
 */

import type { WebsiteConfig } from "@/types/website";
import { createLegacyEntityId } from "@/lib/editor/ids";
import { getSectionVariants } from "@/lib/store/registry/catalog";
import { normalizeSectionVariants } from "@/lib/store/registry/variant-api";

function identitySeed(...parts: string[]): string {
  return parts.map((part) => part.trim()).join("|");
}

/** Assign stable, content-derived ids to legacy collection items that lack them. */
export function normalizeCollectionIdentities(
  config: WebsiteConfig,
): WebsiteConfig {
  let changed = false;
  const content = { ...config.content };

  if (content.products) {
    let productsTouched = false;
    const items = content.products.items.map((item, index) => {
      if (item.id || item.slug) return item;
      productsTouched = true;
      const id = createLegacyEntityId(
        "product",
        identitySeed(
          config.template,
          "product",
          String(index),
          item.name ?? "",
          item.description ?? "",
          item.category ?? "",
        ),
      );
      return { ...item, id, slug: id };
    });
    if (productsTouched) {
      content.products = { ...content.products, items };
      changed = true;
    }
  }

  if (content.services) {
    let touched = false;
    const items = content.services.items.map((item, index) => {
      if (item.id) return item;
      touched = true;
      return {
        ...item,
        id: createLegacyEntityId(
          "service",
          identitySeed(
            config.template,
            "service",
            String(index),
            item.name ?? "",
            item.description ?? "",
          ),
        ),
      };
    });
    if (touched) {
      content.services = { ...content.services, items };
      changed = true;
    }
  }

  if (content.faq) {
    let touched = false;
    const items = content.faq.items.map((item, index) => {
      if (item.id) return item;
      touched = true;
      return {
        ...item,
        id: createLegacyEntityId(
          "faq",
          identitySeed(
            config.template,
            "faq",
            String(index),
            item.question ?? "",
            item.answer ?? "",
          ),
        ),
      };
    });
    if (touched) {
      content.faq = { ...content.faq, items };
      changed = true;
    }
  }

  if (content.testimonials) {
    let touched = false;
    const items = content.testimonials.items.map((item, index) => {
      if (item.id) return item;
      touched = true;
      return {
        ...item,
        id: createLegacyEntityId(
          "testimonial",
          identitySeed(
            config.template,
            "testimonial",
            String(index),
            item.quote ?? "",
            item.author ?? "",
          ),
        ),
      };
    });
    if (touched) {
      content.testimonials = { ...content.testimonials, items };
      changed = true;
    }
  }

  if (!changed) return config;
  return { ...config, content };
}

/** Map legacy hero.style "menu" → supported registry equivalent; sync section.variant. */
export function normalizeLegacyHeroVariant(
  config: WebsiteConfig,
): WebsiteConfig {
  const hero = config.content.hero;
  const registered = new Set(getSectionVariants("hero").map((v) => v.id));
  const rawStyle = hero.style as string;
  const heroSection = config.sections.find((s) => s.type === "hero");
  const rawVariant = heroSection?.variant ?? rawStyle;

  let nextStyle = rawStyle;
  if (rawStyle === "menu") nextStyle = "editorial";
  else if (!registered.has(rawStyle)) nextStyle = "fan";

  let nextVariant = rawVariant;
  if (rawVariant === "menu") nextVariant = "editorial";
  else if (!registered.has(rawVariant)) nextVariant = nextStyle;

  if (nextStyle === rawStyle && nextVariant === rawVariant) return config;

  return {
    ...config,
    content: {
      ...config.content,
      hero: { ...hero, style: nextStyle as typeof hero.style },
    },
    sections: config.sections.map((s) =>
      s.type === "hero" ? { ...s, variant: nextVariant } : s,
    ),
  };
}

/** Run all soft content normalizations (identity + legacy variants). */
export function normalizeEditorConfig(config: WebsiteConfig): WebsiteConfig {
  return normalizeSectionVariants(
    normalizeLegacyHeroVariant(normalizeCollectionIdentities(config)),
  );
}
