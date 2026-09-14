import type { WebsiteConfig } from "@/types/website";

/**
 * Visual direction is deliberately separate from color presets.
 * A visual preset describes composition, density and behavior — not just paint.
 * This keeps future light/dark themes compatible with the same layout language.
 */
export type VisualPresetId =
  | "minimal-editorial"
  | "immersive-cinema"
  | "studio-grid"
  | "quiet-luxury"
  | "bold-commerce"
  | "organic-story"
  | "bento-creative"
  | "mono-gallery";

export type ThemeMode = "light" | "dark" | "system";

export type VisualSectionKind =
  | "navbar"
  | "hero"
  | "content"
  | "products"
  | "gallery"
  | "trust"
  | "conversion";

export type ResponsiveStrategy = {
  mobile: string;
  tablet: string;
  desktop: string;
};

export type VisualPreset = {
  id: VisualPresetId;
  label: { fa: string; en: string };
  description: { fa: string; en: string };
  /** A compact fingerprint used to prevent near-duplicate presets. */
  signature: {
    composition: string;
    typography: string;
    spacing: string;
    media: string;
    cta: string;
  };
  recommendedSections: Partial<Record<VisualSectionKind, string>>;
  responsive: ResponsiveStrategy;
  theme: {
    default: ThemeMode;
    supportsDark: boolean;
    semanticTokens: boolean;
  };
};

export const VISUAL_PRESETS: readonly VisualPreset[] = [
  {
    id: "minimal-editorial",
    label: { fa: "مینیمال ادیتوریال", en: "Minimal Editorial" },
    description: { fa: "تیپوگرافی بزرگ، فضای سفید و تصویر ثانویه", en: "Oversized type, generous whitespace and secondary imagery" },
    signature: { composition: "asymmetric-editorial", typography: "large-serif", spacing: "spacious", media: "secondary-bleed", cta: "quiet-outline" },
    recommendedSections: { navbar: "wordmark", hero: "editorial", content: "story", products: "editorial", gallery: "lookbook", trust: "numbers", conversion: "minimal-cta" },
    responsive: { mobile: "stack-copy-first", tablet: "asymmetric", desktop: "asymmetric" },
    theme: { default: "light", supportsDark: true, semanticTokens: true },
  },
  {
    id: "immersive-cinema",
    label: { fa: "سینمایی", en: "Immersive Cinema" },
    description: { fa: "تصویر تمام‌قد، لایه‌بندی کنترل‌شده و CTA شناور", en: "Full-bleed imagery, restrained layers and floating action" },
    signature: { composition: "full-bleed", typography: "high-contrast-sans", spacing: "heroic", media: "cover-focus", cta: "floating-solid" },
    recommendedSections: { navbar: "transparent-overlay", hero: "immersive", content: "image-led", products: "rail", gallery: "masonry", trust: "overlay-stats", conversion: "floating" },
    responsive: { mobile: "crop-safe-stack", tablet: "full-bleed", desktop: "full-height" },
    theme: { default: "dark", supportsDark: true, semanticTokens: true },
  },
  {
    id: "studio-grid",
    label: { fa: "استودیو گرید", en: "Studio Grid" },
    description: { fa: "شبکه دقیق، فاصله‌های منظم و کنترل سریع", en: "Precise grid, measured spacing and fast scanning" },
    signature: { composition: "strict-grid", typography: "neutral-sans", spacing: "compact", media: "uniform-ratio", cta: "utility" },
    recommendedSections: { navbar: "compact", hero: "split", content: "two-column", products: "grid", gallery: "grid", trust: "inline", conversion: "bar" },
    responsive: { mobile: "2-column", tablet: "3-column", desktop: "4-column" },
    theme: { default: "light", supportsDark: true, semanticTokens: true },
  },
  {
    id: "quiet-luxury",
    label: { fa: "لوکس آرام", en: "Quiet Luxury" },
    description: { fa: "کنتراست ظریف، تایپ سریف و محصول قهرمان", en: "Subtle contrast, refined serif type and hero products" },
    signature: { composition: "gallery-stage", typography: "refined-serif", spacing: "very-spacious", media: "large-product", cta: "understated" },
    recommendedSections: { navbar: "centered", hero: "product-focus", content: "editorial", products: "luxury", gallery: "gallery-stage", trust: "quiet-proof", conversion: "private" },
    responsive: { mobile: "single-column", tablet: "balanced", desktop: "wide-stage" },
    theme: { default: "light", supportsDark: true, semanticTokens: true },
  },
  {
    id: "bold-commerce",
    label: { fa: "کامرس جسور", en: "Bold Commerce" },
    description: { fa: "تیتر سنگین، رنگ تاکیدی و مسیر خرید سریع", en: "Heavy type, strong accent and frictionless shopping" },
    signature: { composition: "modular-commerce", typography: "display-sans", spacing: "dense", media: "product-first", cta: "high-contrast" },
    recommendedSections: { navbar: "commerce", hero: "statement", content: "feature-split", products: "compact-commerce", gallery: "product-grid", trust: "badges", conversion: "purchase" },
    responsive: { mobile: "commerce-stack", tablet: "dense-grid", desktop: "wide-grid" },
    theme: { default: "light", supportsDark: true, semanticTokens: true },
  },
  {
    id: "organic-story",
    label: { fa: "داستان طبیعی", en: "Organic Story" },
    description: { fa: "تصاویر گرم، ریتم ارگانیک و محتوای انسانی", en: "Warm imagery, organic rhythm and human storytelling" },
    signature: { composition: "offset-flow", typography: "soft-serif", spacing: "comfortable", media: "mixed-ratio", cta: "warm-pill" },
    recommendedSections: { navbar: "soft", hero: "split", content: "story", products: "editorial", gallery: "offset", trust: "quotes", conversion: "warm" },
    responsive: { mobile: "stack-with-offset", tablet: "offset-grid", desktop: "asymmetric-flow" },
    theme: { default: "light", supportsDark: true, semanticTokens: true },
  },
  {
    id: "bento-creative",
    label: { fa: "بنتو خلاق", en: "Bento Creative" },
    description: { fa: "بلوک‌های متنوع با یک نقطه تمرکز واضح", en: "Variable blocks with one unmistakable focal point" },
    signature: { composition: "bento", typography: "mixed-scale", spacing: "tight-rhythm", media: "mixed-crop", cta: "block-action" },
    recommendedSections: { navbar: "minimal", hero: "bento", content: "bento-story", products: "bento-products", gallery: "collage", trust: "metric-cards", conversion: "featured-block" },
    responsive: { mobile: "priority-stack", tablet: "bento-2", desktop: "bento-12" },
    theme: { default: "dark", supportsDark: true, semanticTokens: true },
  },
  {
    id: "mono-gallery",
    label: { fa: "مونو گالری", en: "Mono Gallery" },
    description: { fa: "تصویرمحور، تک‌رنگ و مناسب پورتفولیو", en: "Image-led, monochrome and portfolio-ready" },
    signature: { composition: "gallery-first", typography: "mono-sans", spacing: "measured", media: "edge-to-edge", cta: "text-link" },
    recommendedSections: { navbar: "portfolio", hero: "gallery-hero", content: "captioned", products: "case-grid", gallery: "masonry", trust: "clients", conversion: "contact-link" },
    responsive: { mobile: "single-flow", tablet: "masonry-2", desktop: "masonry-3" },
    theme: { default: "dark", supportsDark: true, semanticTokens: true },
  },
];

export function getVisualPreset(id: string | null | undefined) {
  return VISUAL_PRESETS.find((preset) => preset.id === id);
}

export function isVisualPresetDistinct(a: VisualPreset, b: VisualPreset) {
  const keys = ["composition", "typography", "spacing", "media", "cta"] as const;
  return keys.filter((key) => a.signature[key] !== b.signature[key]).length >= 3;
}

export function validateVisualPresetCatalog(presets: readonly VisualPreset[] = VISUAL_PRESETS) {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const preset of presets) {
    if (ids.has(preset.id)) errors.push(`duplicate:${preset.id}`);
    ids.add(preset.id);
    if (!preset.theme.semanticTokens) errors.push(`no-semantic-tokens:${preset.id}`);
    if (!preset.theme.supportsDark) errors.push(`no-dark-contract:${preset.id}`);
  }
  for (let i = 0; i < presets.length; i += 1) {
    for (let j = i + 1; j < presets.length; j += 1) {
      if (!isVisualPresetDistinct(presets[i], presets[j])) {
        errors.push(`too-similar:${presets[i].id}:${presets[j].id}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Apply only the persisted visual identity; content remains untouched. */
export function applyVisualPreset(config: WebsiteConfig, presetId: VisualPresetId): WebsiteConfig {
  const preset = getVisualPreset(presetId);
  if (!preset) return config;
  return {
    ...config,
    settings: {
      ...config.settings,
      mood: preset.id,
      // Future dark-mode support can consume this without changing section data.
      themeMode: preset.theme.default,
    },
  } as WebsiteConfig;
}
