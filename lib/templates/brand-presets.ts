/**
 * Shared brand presets for full-site templates.
 * Bridges into WebsiteConfig.brand — not a second token system.
 */

import type { TemplateBrandPreset } from "@/lib/templates/types";

export const BRAND_LUXURY: TemplateBrandPreset = {
  colors: {
    primary: "#1a1a1a",
    secondary: "#f7f3ee",
    accent: "#b8956c",
    background: "#faf8f5",
    foreground: "#1a1a1a",
    muted: "#efeae3",
  },
  typography: { heading: "serif", body: "sans", scale: "editorial" },
  design: {
    contentWidth: "default",
    sectionSpacing: "spacious",
    radius: "soft",
    shadow: "subtle",
  },
  tagline: "Crafted for modern elegance",
};

export const BRAND_EDITORIAL: TemplateBrandPreset = {
  colors: {
    primary: "#111111",
    secondary: "#ffffff",
    accent: "#c45c26",
    background: "#f6f4f0",
    foreground: "#111111",
    muted: "#ebe7e0",
  },
  typography: { heading: "serif", body: "sans", scale: "editorial" },
  design: {
    contentWidth: "narrow",
    sectionSpacing: "comfortable",
    radius: "sharp",
    shadow: "none",
  },
  tagline: "Seasonal stories, thoughtfully plated",
};

export const BRAND_MODERN: TemplateBrandPreset = {
  colors: {
    primary: "#0f172a",
    secondary: "#ffffff",
    accent: "#2563eb",
    background: "#ffffff",
    foreground: "#0f172a",
    muted: "#f1f5f9",
  },
  typography: { heading: "sans", body: "sans", scale: "compact" },
  design: {
    contentWidth: "wide",
    sectionSpacing: "comfortable",
    radius: "rounded",
    shadow: "subtle",
  },
  tagline: "Build better workflows",
};

export const BRAND_PREMIUM_SOFT: TemplateBrandPreset = {
  colors: {
    primary: "#3d2c29",
    secondary: "#fff8f5",
    accent: "#d4a5a5",
    background: "#fffaf8",
    foreground: "#3d2c29",
    muted: "#f3e8e4",
  },
  typography: { heading: "serif", body: "sans", scale: "editorial" },
  design: {
    contentWidth: "default",
    sectionSpacing: "spacious",
    radius: "rounded",
    shadow: "subtle",
  },
  tagline: "Care routines, calmly presented",
};

export const BRAND_CREATIVE: TemplateBrandPreset = {
  colors: {
    primary: "#0a0a0a",
    secondary: "#ffffff",
    accent: "#ef6351",
    background: "#ffffff",
    foreground: "#0a0a0a",
    muted: "#f4f4f5",
  },
  typography: { heading: "display", body: "sans", scale: "bold" },
  design: {
    contentWidth: "wide",
    sectionSpacing: "comfortable",
    radius: "soft",
    shadow: "elevated",
  },
  tagline: "Design that earns attention",
};

export const BRAND_PORTFOLIO: TemplateBrandPreset = {
  colors: {
    primary: "#171717",
    secondary: "#fafafa",
    accent: "#525252",
    background: "#fafafa",
    foreground: "#171717",
    muted: "#f0f0f0",
  },
  typography: { heading: "sans", body: "sans", scale: "compact" },
  design: {
    contentWidth: "default",
    sectionSpacing: "compact",
    radius: "sharp",
    shadow: "none",
  },
  tagline: "Selected work",
};

export const BRAND_REAL_ESTATE: TemplateBrandPreset = {
  colors: {
    primary: "#1c2b2d",
    secondary: "#f5f7f7",
    accent: "#2f6f6a",
    background: "#ffffff",
    foreground: "#1c2b2d",
    muted: "#eef2f2",
  },
  typography: { heading: "serif", body: "sans", scale: "editorial" },
  design: {
    contentWidth: "wide",
    sectionSpacing: "comfortable",
    radius: "soft",
    shadow: "subtle",
  },
  tagline: "Homes with presence",
};

export const BRAND_COFFEE: TemplateBrandPreset = {
  colors: {
    primary: "#2c1810",
    secondary: "#f7f1ea",
    accent: "#8b5a2b",
    background: "#fbf7f2",
    foreground: "#2c1810",
    muted: "#efe6db",
  },
  typography: { heading: "serif", body: "sans", scale: "editorial" },
  design: {
    contentWidth: "default",
    sectionSpacing: "comfortable",
    radius: "soft",
    shadow: "subtle",
  },
  tagline: "Origin, roast, and ritual",
};
