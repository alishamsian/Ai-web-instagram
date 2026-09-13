import type { WebsiteConfig } from "@/types/website";
import type { Product } from "@/types/ai";

export type StoreMood =
  | "luxury"
  | "minimal"
  | "bold"
  | "natural"
  | "editorial"
  | "modern"
  | "dark";

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
  /** Mood-driven chrome */
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  sectionPad: string;
  buttonRadius: string;
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

export function inferStoreMood(config: WebsiteConfig): StoreMood {
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

export function buildStoreTokens(config: WebsiteConfig): StoreTokens {
  const c = config.brand.colors;
  const mood = inferStoreMood(config);
  const bg = c.background;
  const fg = c.foreground;
  const muted = c.muted;
  const accent = c.accent || c.primary;
  const accentFg = c.secondary || bg;

  const chrome = moodChrome(mood);

  return {
    background: bg,
    backgroundSubtle: mixApprox(muted, bg, 0.55),
    surface: mood === "dark" ? mixApprox(bg, fg, 0.06) : mixApprox(bg, "#ffffff", 0.7),
    surfaceElevated:
      mood === "dark" ? mixApprox(bg, fg, 0.1) : "#ffffff",
    foreground: fg,
    foregroundSecondary: mixApprox(fg, bg, 0.28),
    foregroundMuted: mixApprox(fg, bg, 0.45),
    border: mixApprox(fg, bg, 0.1),
    borderSubtle: mixApprox(fg, bg, 0.06),
    borderStrong: mixApprox(fg, bg, 0.18),
    accent,
    accentForeground: accentFg,
    success: "#2F6B4F",
    warning: "#B45309",
    error: "#B42318",
    ...chrome,
  };
}

function moodChrome(mood: StoreMood) {
  switch (mood) {
    case "luxury":
      return {
        radiusSm: "0",
        radiusMd: "0.15rem",
        radiusLg: "0.25rem",
        radiusXl: "0.4rem",
        sectionPad: "clamp(3.5rem, 8vw, 6.5rem)",
        buttonRadius: "0.15rem",
      };
    case "bold":
      return {
        radiusSm: "0.2rem",
        radiusMd: "0.4rem",
        radiusLg: "0.65rem",
        radiusXl: "1rem",
        sectionPad: "clamp(2.75rem, 6vw, 5rem)",
        buttonRadius: "0.35rem",
      };
    case "minimal":
    case "modern":
      return {
        radiusSm: "0.15rem",
        radiusMd: "0.35rem",
        radiusLg: "0.5rem",
        radiusXl: "0.75rem",
        sectionPad: "clamp(3rem, 7vw, 5.5rem)",
        buttonRadius: "0.35rem",
      };
    case "natural":
      return {
        radiusSm: "0.25rem",
        radiusMd: "0.5rem",
        radiusLg: "0.75rem",
        radiusXl: "1rem",
        sectionPad: "clamp(3.25rem, 7.5vw, 6rem)",
        buttonRadius: "0.5rem",
      };
    case "dark":
      return {
        radiusSm: "0.15rem",
        radiusMd: "0.3rem",
        radiusLg: "0.5rem",
        radiusXl: "0.75rem",
        sectionPad: "clamp(3rem, 7vw, 5.5rem)",
        buttonRadius: "0.25rem",
      };
    case "editorial":
    default:
      return {
        radiusSm: "0.1rem",
        radiusMd: "0.25rem",
        radiusLg: "0.4rem",
        radiusXl: "0.65rem",
        sectionPad: "clamp(3.25rem, 7.5vw, 6rem)",
        buttonRadius: "0.2rem",
      };
  }
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
