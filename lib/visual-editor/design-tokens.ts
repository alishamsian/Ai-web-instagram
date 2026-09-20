/**
 * Visual-editor design token bridge.
 * Extends WebsiteConfig brand colors / BrandDesignConfig — does not invent a second SoT.
 */

import type { WebsiteConfig } from "@/types/website";

export type VisualDesignTokens = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    heading: string;
    body: string;
    scale: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    none: string;
    sm: string;
    md: string;
  };
  containers: {
    narrow: string;
    default: string;
    wide: string;
  };
};

const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
  "2xl": "64px",
} as const;

const RADIUS_MAP = {
  sharp: { none: "0", sm: "2px", md: "4px", lg: "6px", full: "9999px" },
  soft: { none: "0", sm: "4px", md: "8px", lg: "12px", full: "9999px" },
  rounded: { none: "0", sm: "8px", md: "12px", lg: "20px", full: "9999px" },
} as const;

const CONTAINER_MAP = {
  narrow: { narrow: "720px", default: "880px", wide: "1040px" },
  default: { narrow: "720px", default: "1100px", wide: "1280px" },
  wide: { narrow: "880px", default: "1280px", wide: "1440px" },
} as const;

const SHADOW_MAP = {
  none: { none: "none", sm: "none", md: "none" },
  subtle: {
    none: "none",
    sm: "0 1px 2px rgba(0,0,0,0.06)",
    md: "0 4px 12px rgba(0,0,0,0.08)",
  },
  elevated: {
    none: "none",
    sm: "0 2px 8px rgba(0,0,0,0.1)",
    md: "0 12px 32px rgba(0,0,0,0.14)",
  },
} as const;

/** Resolve tokens from existing WebsiteConfig brand — backward compatible. */
export function resolveVisualDesignTokens(
  config: WebsiteConfig,
): VisualDesignTokens {
  const design = config.brand.design;
  const radiusKey = design?.radius ?? "soft";
  const containerKey = design?.contentWidth ?? "default";
  const shadowKey = design?.shadow ?? "subtle";
  return {
    colors: { ...config.brand.colors },
    typography: {
      heading: config.brand.typography.heading,
      body: config.brand.typography.body,
      scale: config.brand.typography.scale,
    },
    spacing: { ...SPACING },
    radius: { ...RADIUS_MAP[radiusKey] },
    shadows: { ...SHADOW_MAP[shadowKey] },
    containers: { ...CONTAINER_MAP[containerKey] },
  };
}

/** CSS custom properties injected into the GrapesJS canvas. */
export function visualDesignTokenCssVars(
  tokens: VisualDesignTokens,
): Record<string, string> {
  return {
    "--ve-color-primary": tokens.colors.primary,
    "--ve-color-secondary": tokens.colors.secondary,
    "--ve-color-accent": tokens.colors.accent,
    "--ve-color-background": tokens.colors.background,
    "--ve-color-foreground": tokens.colors.foreground,
    "--ve-color-muted": tokens.colors.muted,
    "--ve-space-xs": tokens.spacing.xs,
    "--ve-space-sm": tokens.spacing.sm,
    "--ve-space-md": tokens.spacing.md,
    "--ve-space-lg": tokens.spacing.lg,
    "--ve-space-xl": tokens.spacing.xl,
    "--ve-space-2xl": tokens.spacing["2xl"],
    "--ve-radius-none": tokens.radius.none,
    "--ve-radius-sm": tokens.radius.sm,
    "--ve-radius-md": tokens.radius.md,
    "--ve-radius-lg": tokens.radius.lg,
    "--ve-radius-full": tokens.radius.full,
    "--ve-shadow-sm": tokens.shadows.sm,
    "--ve-shadow-md": tokens.shadows.md,
    "--ve-container-narrow": tokens.containers.narrow,
    "--ve-container-default": tokens.containers.default,
    "--ve-container-wide": tokens.containers.wide,
  };
}

export function visualDesignTokenStyleTag(tokens: VisualDesignTokens): string {
  const vars = visualDesignTokenCssVars(tokens);
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `:root{${body}}body{font-family:system-ui,-apple-system,sans-serif;color:var(--ve-color-foreground);background:var(--ve-color-background);}`;
}
