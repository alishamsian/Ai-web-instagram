/**
 * Component visual contracts — Phase 1 vocabulary for Registry later.
 * Implementation remains in app/store.css + components/store/primitives.tsx.
 */

export const buttonContract = {
  sizes: ["sm", "md", "lg"] as const,
  variants: ["primary", "secondary", "outline", "ghost", "link", "on-dark"] as const,
  minHeight: {
    sm: "2.35rem",
    md: "2.85rem",
    lg: "3.15rem",
  },
  /** Prefer mood `buttonRadius` token; fallback */
  radius: "var(--store-btn-radius)",
  typographyRole: "button" as const,
  states: ["default", "hover", "focus-visible", "disabled", "loading"] as const,
  focusRing: "2px solid var(--store-accent)",
  touchMin: "44px",
  css: {
    base: "store-btn",
    primary: "store-btn--solid",
    secondary: "store-btn--secondary",
    outline: "store-btn--ghost",
    ghost: "store-btn--ghost",
    link: "store-btn--text",
    onDark: "store-btn--on-dark",
  },
} as const;

export const inputContract = {
  height: "2.85rem",
  radius: "var(--store-btn-radius)",
  border: "1px solid var(--store-border)",
  background: "var(--store-surface-elevated)",
  typography: "0.95rem",
  focusRing: "2px solid var(--store-accent)",
  states: ["default", "focus", "disabled", "error"] as const,
  css: {
    base: "store-input",
    error: "store-input--error",
  },
} as const;

/**
 * Canonical ProductCard for Store template:
 * `components/store/StoreProductCard.tsx`
 *
 * Legacy / multi-template card (do not delete yet):
 * `components/website/StoreProductCard.tsx` — used by non-store WebsiteRenderer sections.
 *
 * Migration: Store path is source of truth; website card stays until section registry
 * migrates restaurant/services/etc. onto Store DS primitives.
 */
export const productCardContract = {
  canonicalImport: "@/components/store/StoreProductCard",
  legacyImport: "@/components/website/StoreProductCard",
  variants: ["classic", "minimal", "editorial", "compact"] as const,
  ratios: ["1/1", "4/5", "3/4", "3/5"] as const,
  defaultRatio: "4/5" as const,
  imageTreatment: ["cover", "secondaryHover"] as const,
  features: [
    "title",
    "metadata",
    "price",
    "compareAtPrice",
    "badges",
    "wishlist",
    "quickView",
    "addToCart",
  ] as const,
  css: {
    root: "store-card",
    visual: "store-card__visual",
    title: "store-card__title",
    price: "store-card__price",
    badge: "store-card__badge",
  },
} as const;
