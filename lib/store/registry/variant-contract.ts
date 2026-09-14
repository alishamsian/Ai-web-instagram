/**
 * Section variant contracts — metadata for the registry SSoT.
 * Content stays in WebsiteConfig; variants describe composition only.
 */

/** Typed responsive behaviors — not free-form strings. */
export const VARIANT_RESPONSIVE_STRATEGIES = [
  "stack-copy-first",
  "crop-safe-full-bleed",
  "priority-content-first",
  "media-first",
  "centered-collapse",
  "asymmetric",
  "split-stack",
  "overlay-safe",
  "grid-2",
  "grid-3",
  "grid-4",
  "rail-scroll",
  "lookbook-stack",
  "banner-stack",
  "story-stack",
  "editorial-stack",
  "masonry-2",
  "bento-priority-stack",
  "horizontal-scroll",
] as const;

export type VariantResponsiveStrategy =
  (typeof VARIANT_RESPONSIVE_STRATEGIES)[number];

export type VariantResponsiveContract = {
  mobile: VariantResponsiveStrategy;
  tablet: VariantResponsiveStrategy;
  desktop: VariantResponsiveStrategy;
};

/**
 * Meaningful visual dimensions — colors/radius/shadow alone do NOT count.
 */
export type VariantVisualSignature = {
  composition: string;
  alignment: string;
  typography: string;
  density: string;
  media: string;
  cta: string;
  hierarchy: string;
};

export type VariantThemeContract = {
  light: boolean;
  dark: boolean;
  /** Consumes semantic --site-* / --store-* tokens rather than hardcoded paint. */
  semanticTokens: boolean;
};

export type VariantCapabilityFlags = {
  supportsImage?: boolean;
  supportsEyebrow?: boolean;
  supportsDescription?: boolean;
  supportsPrimaryCTA?: boolean;
  supportsSecondaryCTA?: boolean;
  supportsBadge?: boolean;
  supportsPrice?: boolean;
  supportsOverlay?: boolean;
  supportsMultipleItems?: boolean;
  supportsRichText?: boolean;
  supportsReorder?: boolean;
  supportsRTL?: boolean;
  supportsDark?: boolean;
};

export type VariantMotionIntent = "none" | "subtle" | "expressive";

export type VariantAvailability = "stable" | "legacy" | "experimental";

export const VARIANT_SIGNATURE_KEYS = [
  "composition",
  "alignment",
  "typography",
  "density",
  "media",
  "cta",
  "hierarchy",
] as const satisfies readonly (keyof VariantVisualSignature)[];

export function isVariantResponsiveStrategy(
  value: string,
): value is VariantResponsiveStrategy {
  return (VARIANT_RESPONSIVE_STRATEGIES as readonly string[]).includes(value);
}
