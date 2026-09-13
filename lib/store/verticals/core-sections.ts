/**
 * Core / universal section types always available for any vertical.
 * Vertical packs add recommendations; they do not fork the Registry.
 */
export const CORE_ECOMMERCE_SECTIONS = [
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
  "promo",
  "footer",
] as const;

export type CoreEcommerceSection = (typeof CORE_ECOMMERCE_SECTIONS)[number];
