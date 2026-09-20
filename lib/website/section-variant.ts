/**
 * Resolve section.variant (+ optional content style) into a concrete visual mode
 * for shared WebsiteRenderer section components.
 */

import type { SectionConfig, WebsiteConfig } from "@/types/website";
import {
  ABOUT_VARIANTS,
  CTA_VARIANTS,
  GALLERY_VARIANTS,
  HERO_VARIANTS,
  TESTIMONIAL_VARIANTS,
  resolveVariantId,
} from "@/lib/visual-editor/registry/variants";

export type HeroVisualMode =
  | "overlay"
  | "editorial"
  | "minimal"
  | "centered"
  | "split";

export function resolveHeroVisualMode(
  config: WebsiteConfig,
  section?: SectionConfig | null,
): HeroVisualMode {
  const requested = section?.variant?.trim();
  if (requested) {
    const resolved = resolveVariantId(HERO_VARIANTS, requested);
    if (resolved === "editorial") return "editorial";
    if (resolved === "overlay") return "overlay";
    if (resolved === "minimal") return "minimal";
    if (resolved === "centered") return "centered";
    if (resolved === "split") return "split";
  }

  // No authoritative section.variant — preserve legacy template heuristics.
  const isStore = config.template === "store";
  const isEditorialTemplate =
    isStore ||
    config.template === "restaurant" ||
    config.brand.typography.scale === "editorial";
  if (isEditorialTemplate) return "editorial";

  const style = config.content.hero?.style;
  if (style === "overlay" || style === "menu") return "overlay";
  if (style === "minimal") return "minimal";
  if (style === "split") return "split";
  return "split";
}

export function resolveAboutVariant(
  section?: SectionConfig | null,
): "story" | "split" {
  const id = resolveVariantId(ABOUT_VARIANTS, section?.variant) || "story";
  return id === "split" ? "split" : "story";
}

export function resolveGalleryVariant(
  section?: SectionConfig | null,
): "grid" | "masonry" {
  const id = resolveVariantId(GALLERY_VARIANTS, section?.variant) || "grid";
  return id === "masonry" ? "masonry" : "grid";
}

export function resolveTestimonialVariant(
  section?: SectionConfig | null,
): "quote" | "cards" | "carousel" {
  const id =
    resolveVariantId(TESTIMONIAL_VARIANTS, section?.variant) || "quote";
  if (id === "cards") return "cards";
  if (id === "carousel") return "carousel";
  return "quote";
}

export function resolveCtaVariant(
  section?: SectionConfig | null,
): "simple" | "split" | "full-width" {
  const id = resolveVariantId(CTA_VARIANTS, section?.variant) || "simple";
  if (id === "split") return "split";
  if (id === "full-width") return "full-width";
  return "simple";
}

/** Unknown / unsupported variants fall back via resolveVariantId defaults. */
export function resolveKnownSectionVariant(
  type: string,
  requested?: string,
): string | undefined {
  switch (type) {
    case "hero":
      return resolveVariantId(HERO_VARIANTS, requested);
    case "about":
      return resolveVariantId(ABOUT_VARIANTS, requested);
    case "gallery":
    case "instagram-feed":
    case "featured-posts":
      return resolveVariantId(GALLERY_VARIANTS, requested);
    case "testimonials":
      return resolveVariantId(TESTIMONIAL_VARIANTS, requested);
    case "cta":
    case "promo":
      return resolveVariantId(CTA_VARIANTS, requested);
    default:
      return requested;
  }
}
