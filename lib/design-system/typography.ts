/**
 * Typography scale — semantic roles for editorial ecommerce.
 * Values mirror existing `.store-*` CSS; themes may swap families via WebsiteConfig.
 */

export type TypographyRole =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "bodySmall"
  | "caption"
  | "eyebrow"
  | "label"
  | "button"
  | "price"
  | "productTitle"
  | "productMeta";

export type TypographyStyle = {
  /** CSS class already defined in app/store.css when available */
  className?: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight?: string | number;
  textTransform?: "none" | "uppercase";
};

/** Derived from current store.css — do not invent a new visual language here. */
export const typographyScale: Record<TypographyRole, TypographyStyle> = {
  display: {
    className: "store-display",
    fontSize: "clamp(2.35rem, 6.2vw, 4.85rem)",
    lineHeight: "0.96",
    letterSpacing: "-0.04em",
    fontWeight: 450,
  },
  h1: {
    className: "store-display store-display--sm",
    fontSize: "clamp(1.75rem, 4vw, 3.1rem)",
    lineHeight: "1.02",
    letterSpacing: "-0.035em",
    fontWeight: 450,
  },
  h2: {
    className: "store-heading",
    fontSize: "clamp(1.5rem, 3vw, 2.35rem)",
    lineHeight: "1.12",
    letterSpacing: "-0.03em",
    fontWeight: 450,
  },
  h3: {
    className: "store-heading store-heading--sm",
    fontSize: "1.2rem",
    lineHeight: "1.2",
    letterSpacing: "-0.02em",
    fontWeight: 450,
  },
  h4: {
    fontSize: "1.05rem",
    lineHeight: "1.35",
    letterSpacing: "-0.015em",
    fontWeight: 500,
  },
  body: {
    className: "store-lead",
    fontSize: "1.02rem",
    lineHeight: "1.7",
  },
  bodySmall: {
    className: "store-muted",
    fontSize: "0.92rem",
    lineHeight: "1.6",
  },
  caption: {
    fontSize: "0.78rem",
    lineHeight: "1.45",
    letterSpacing: "0.02em",
  },
  eyebrow: {
    className: "store-kicker",
    fontSize: "0.68rem",
    lineHeight: "1.4",
    letterSpacing: "0.16em",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  label: {
    fontSize: "0.72rem",
    lineHeight: "1.4",
    letterSpacing: "0.08em",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  button: {
    className: "store-btn",
    fontSize: "0.7rem",
    lineHeight: "1",
    letterSpacing: "0.12em",
    fontWeight: 650,
    textTransform: "uppercase",
  },
  price: {
    className: "store-card__price",
    fontSize: "0.92rem",
    lineHeight: "1.3",
    fontWeight: 500,
  },
  productTitle: {
    className: "store-card__title",
    fontSize: "0.98rem",
    lineHeight: "1.35",
    letterSpacing: "-0.02em",
    fontWeight: 450,
  },
  productMeta: {
    className: "store-card__meta",
    fontSize: "0.72rem",
    lineHeight: "1.4",
    letterSpacing: "0.04em",
  },
};
