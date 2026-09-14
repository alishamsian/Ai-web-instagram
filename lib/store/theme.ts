import type { WebsiteConfig } from "@/types/website";
import type { Product } from "@/types/ai";
import { moodChrome, resolveColorScheme, type StoreMood } from "@/lib/design-system/themes";
import { primitiveColor } from "@/lib/design-system/primitives";
import { applyDesignChrome } from "@/lib/design-system/brand-design";

export type { StoreMood };
export { STORE_THEME_IDS } from "@/lib/design-system/themes";

/** Full semantic token set — single source of truth for Store visuals. */
export type StoreTokens = {
  background: string;
  backgroundSubtle: string;
  surface: string;
  surfaceElevated: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  accent: string;
  accentForeground: string;
  success: string;
  warning: string;
  error: string;
  /** Mood-driven chrome (overridable via brand.design) */
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  sectionPad: string;
  buttonRadius: string;
  wrap: string;
  shadowSubtle: string;
  shadowCard: string;
  shadowElevated: string;
};

export type StoreCatalogProduct = Product & {
  id: string;
  slug: string;
  shortDescription?: string;
  compareAtPrice?: number | null;
  badges?: string[];
  isNew?: boolean;
  isBestSeller?: boolean;
  featured?: boolean;
};

export type StoreCategory = {
  id: string;
  title: string;
  description: string;
  imageId?: string;
  href: string;
};

/**
 * Infers visual mood from brand signals.
 * Does NOT classify business vertical — keep Vertical separate upstream.
 */
export function inferStoreMood(config: WebsiteConfig): StoreMood {
  const explicit = config.settings.mood;
  if (
    explicit === "luxury" ||
    explicit === "minimal" ||
    explicit === "bold" ||
    explicit === "natural" ||
    explicit === "editorial" ||
    explicit === "modern" ||
    explicit === "dark"
  ) {
    return explicit;
  }
  const tone = [
    ...(config.brand.tagline?.toLowerCase().split(/\s+/) ?? []),
    config.brand.name.toLowerCase(),
  ].join(" ");
  const colors = config.brand.colors;
  const bg = colors.background.toLowerCase();
  const fg = colors.foreground.toLowerCase();
  const darkBg =
    bg === "#0a0a0a" ||
    bg === "#111111" ||
    bg === "#0f172a" ||
    fg === "#f5f5f5" ||
    fg === "#fafafa";

  if (darkBg) return "dark";
  if (/jewel|گالری|لوکس|luxury|gold|ساعت|گردنبند|atelier/.test(tone))
    return "luxury";
  if (/street|bold|ورزشی|sneaker/.test(tone)) return "bold";
  if (/skin|beauty|serum|glow|مراقبت|پوست|luna/.test(tone)) return "minimal";
  if (/home|decor|طبیعی|چوبی|linen/.test(tone)) return "natural";
  if (/tech|modern|studio|minimal/.test(tone)) return "modern";
  if (config.brand.typography.heading === "serif") return "editorial";
  if (config.brand.typography.heading === "display") return "bold";
  return "editorial";
}

export function buildStoreTokens(
  config: WebsiteConfig,
  options: { systemPreference?: "light" | "dark" | null } = {},
): StoreTokens {
  const c = config.brand.colors;
  const mood = inferStoreMood(config);
  const scheme = resolveColorScheme(
    config.settings.themeMode,
    options.systemPreference,
  );
  const treatAsDark = scheme === "dark" || mood === "dark";
  const bg = c.background;
  const fg = c.foreground;
  const muted = c.muted;
  const accent = c.accent || c.primary;
  const accentFg = c.secondary || bg;

  const chrome = applyDesignChrome(moodChrome(mood), config.brand.design);

  return {
    background: bg,
    backgroundSubtle: mixApprox(muted, bg, 0.55),
    surface: treatAsDark
      ? mixApprox(bg, fg, 0.06)
      : mixApprox(bg, "#ffffff", 0.7),
    surfaceElevated: treatAsDark ? mixApprox(bg, fg, 0.1) : "#ffffff",
    foreground: fg,
    foregroundSecondary: mixApprox(fg, bg, 0.28),
    foregroundMuted: mixApprox(fg, bg, 0.45),
    border: mixApprox(fg, bg, 0.1),
    borderSubtle: mixApprox(fg, bg, 0.06),
    borderStrong: mixApprox(fg, bg, 0.18),
    accent,
    accentForeground: accentFg,
    success: primitiveColor.success,
    warning: primitiveColor.warning,
    error: primitiveColor.error,
    radiusSm: chrome.radiusSm,
    radiusMd: chrome.radiusMd,
    radiusLg: chrome.radiusLg,
    radiusXl: chrome.radiusXl,
    sectionPad: chrome.sectionPad,
    buttonRadius: chrome.buttonRadius,
    wrap: chrome.wrap,
    shadowSubtle: chrome.shadowSubtle,
    shadowCard: chrome.shadowCard,
    shadowElevated: chrome.shadowElevated,
  };
}

/** Lightweight hex mix without color libs. */
export function mixApprox(a: string, b: string, t: number) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : h;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex(n: number) {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}
