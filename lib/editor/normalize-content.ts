/**
 * Soft identity / legacy normalization for WebsiteConfig content collections.
 * Pure — does not persist. Safe to run on editor load.
 */

import type { WebsiteConfig } from "@/types/website";
import { createEntityId } from "@/lib/editor/ids";
import { getSectionVariants } from "@/lib/store/registry/catalog";

/** Assign stable ids to collection items that lack them (backwards compatible). */
export function normalizeCollectionIdentities(
  config: WebsiteConfig,
): WebsiteConfig {
  let changed = false;
  const content = { ...config.content };

  if (content.products) {
    let productsTouched = false;
    const items = content.products.items.map((item) => {
      if (item.id || item.slug) return item;
      productsTouched = true;
      const id = createEntityId("product");
      return { ...item, id, slug: id };
    });
    if (productsTouched) {
      content.products = { ...content.products, items };
      changed = true;
    }
  }

  if (content.services) {
    let touched = false;
    const items = content.services.items.map((item) => {
      if (item.id) return item;
      touched = true;
      return { ...item, id: createEntityId("service") };
    });
    if (touched) {
      content.services = { ...content.services, items };
      changed = true;
    }
  }

  if (content.faq) {
    let touched = false;
    const items = content.faq.items.map((item) => {
      if (item.id) return item;
      touched = true;
      return { ...item, id: createEntityId("faq") };
    });
    if (touched) {
      content.faq = { ...content.faq, items };
      changed = true;
    }
  }

  if (content.testimonials) {
    let touched = false;
    const items = content.testimonials.items.map((item) => {
      if (item.id) return item;
      touched = true;
      return { ...item, id: createEntityId("testimonial") };
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
  return normalizeLegacyHeroVariant(normalizeCollectionIdentities(config));
}
