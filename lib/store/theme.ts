import type { WebsiteConfig } from "@/types/website";
import type { Product } from "@/types/ai";

export type StoreMood = "luxury" | "minimal" | "bold" | "natural" | "editorial";

export type StoreTokens = {
  background: string;
  foreground: string;
  muted: string;
  mutedFg: string;
  surface: string;
  surfaceHover: string;
  border: string;
  accent: string;
  accentFg: string;
  success: string;
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
  const darkBg =
    colors.background.toLowerCase() === "#0a0a0a" ||
    colors.background.toLowerCase() === "#111111" ||
    colors.foreground.toLowerCase() === "#f5f5f5";

  if (darkBg) return "bold";
  if (/jewel|گالری|لوکس|luxury|gold|ساعت|گردنبند/.test(tone)) return "luxury";
  if (/skin|beauty|serum|glow|مراقبت|پوست/.test(tone)) return "minimal";
  if (/home|decor|طبیعی|چوبی/.test(tone)) return "natural";
  if (config.brand.typography.heading === "serif") return "editorial";
  return "editorial";
}

export function buildStoreTokens(config: WebsiteConfig): StoreTokens {
  const c = config.brand.colors;
  const mood = inferStoreMood(config);

  const surface =
    mood === "bold"
      ? mixApprox(c.background, c.foreground, 0.08)
      : mixApprox(c.muted, c.background, 0.35);

  return {
    background: c.background,
    foreground: c.foreground,
    muted: c.muted,
    mutedFg: mixApprox(c.foreground, c.background, 0.42),
    surface,
    surfaceHover: mixApprox(c.muted, c.foreground, 0.06),
    border: mixApprox(c.foreground, c.background, 0.12),
    accent: c.accent || c.primary,
    accentFg: c.secondary || c.background,
    success: "#2F6B4F",
  };
}

/** Lightweight hex mix without color libs. */
function mixApprox(a: string, b: string, t: number) {
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
