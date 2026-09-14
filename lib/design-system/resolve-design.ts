/**
 * Pure design-token resolution.
 * Brand + themeMode + optional visual preset → DesignTokens.
 * No React, no window, no Date.now — deterministic given identical inputs.
 */

import type { WebsiteConfig, TypographyConfig } from "@/types/website";
import {
  DARK_THEME_BASE,
  LIGHT_THEME_BASE,
  moodChrome,
  normalizeThemeMode,
  resolveColorScheme,
} from "@/lib/design-system/themes";
import { applyDesignChrome } from "@/lib/design-system/brand-design";
import {
  primitiveColor,
  primitiveLayout,
  primitiveMotion,
  primitiveShadow,
  primitiveSpace,
} from "@/lib/design-system/primitives";
import { spacing } from "@/lib/design-system/spacing";
import { typographyScale } from "@/lib/design-system/typography";
import {
  getVisualPreset,
  type VisualPresetId,
} from "@/lib/design-system/visual-presets";
import { inferStoreMood, mixApprox } from "@/lib/store/theme";
import type {
  ColorScheme,
  DesignTokens,
  FontStackTokens,
  MotionTokens,
  RadiusTokens,
  WebsiteColorTokens,
  SpacingTokens,
  TypographyTokens,
} from "@/lib/design-system/tokens";

export type ResolveDesignOptions = {
  /** Browser preference — only used when themeMode === "system". Never read window here. */
  systemPreference?: ColorScheme | null;
  /** Runtime prefers-reduced-motion — defaults false for deterministic SSR. */
  reducedMotion?: boolean;
};

const SERIF_STACK =
  'Georgia, "Times New Roman", "Noto Naskh Arabic", "Noto Serif", serif';
const SANS_STACK =
  'var(--font-vazirmatn, "Vazirmatn"), system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif';
const DISPLAY_STACK =
  'var(--font-geist-sans, Geist), var(--font-vazirmatn, "Vazirmatn"), system-ui, sans-serif';
const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

function fontStacks(typography: TypographyConfig): FontStackTokens {
  const heading =
    typography.heading === "serif"
      ? SERIF_STACK
      : typography.heading === "display"
        ? DISPLAY_STACK
        : SANS_STACK;
  const body = typography.body === "serif" ? SERIF_STACK : SANS_STACK;
  return {
    display: typography.heading === "display" ? DISPLAY_STACK : heading,
    heading,
    body,
    mono: MONO_STACK,
  };
}

function roleFromScale(
  role: keyof typeof typographyScale,
  family: string,
): TypographyTokens["body"] {
  const style = typographyScale[role];
  return {
    fontFamily: family,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing ?? "0",
    fontWeight: style.fontWeight ?? 400,
  };
}

function buildTypography(
  typography: TypographyConfig,
  fonts: FontStackTokens,
): TypographyTokens {
  const density =
    typography.scale === "compact"
      ? 0.94
      : typography.scale === "bold"
        ? 1.04
        : 1;
  const scaleSize = (value: string) => {
    if (density === 1 || !value.endsWith("rem")) return value;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return value;
    return `${(n * density).toFixed(3).replace(/\.?0+$/, "")}rem`;
  };

  const map = (role: keyof typeof typographyScale, family: string) => {
    const base = roleFromScale(role, family);
    return { ...base, fontSize: scaleSize(base.fontSize) };
  };

  return {
    display: map("display", fonts.display),
    heading: map("h1", fonts.heading),
    subheading: map("h2", fonts.heading),
    body: map("body", fonts.body),
    bodySmall: map("bodySmall", fonts.body),
    caption: map("caption", fonts.body),
    label: map("label", fonts.body),
    button: map("button", fonts.body),
  };
}

function buildColors(
  config: WebsiteConfig,
  scheme: ColorScheme,
): WebsiteColorTokens {
  const base = scheme === "dark" ? DARK_THEME_BASE : LIGHT_THEME_BASE;
  const c = config.brand.colors;
  const brandBg = c.background?.trim() || base.background;
  const brandFg = c.foreground?.trim() || base.foreground;
  const brandMuted = c.muted?.trim() || base.backgroundSubtle;
  const brandAccent = (c.accent || c.primary || base.accent).trim();
  const brandAccentFg = (c.secondary || base.accentForeground).trim();

  // When themeMode forces dark/light but brand still has light/dark paint,
  // blend toward the scheme base so semantic surfaces stay readable.
  const useBrandPaint =
    scheme === "dark"
      ? isDarkish(brandBg)
      : !isDarkish(brandBg);

  const bg = useBrandPaint ? brandBg : base.background;
  const fg = useBrandPaint ? brandFg : base.foreground;
  const muted = useBrandPaint ? brandMuted : base.backgroundSubtle;
  const accent = brandAccent || base.accent;
  const accentFg = brandAccentFg || base.accentForeground;

  const surface =
    scheme === "dark"
      ? mixApprox(bg, fg, 0.07)
      : mixApprox(bg, "#ffffff", 0.65);
  const surfaceElevated =
    scheme === "dark" ? mixApprox(bg, fg, 0.12) : base.surfaceElevated;
  const surfaceMuted =
    scheme === "dark" ? mixApprox(bg, fg, 0.04) : mixApprox(muted, bg, 0.4);

  return {
    background: bg,
    backgroundSubtle: mixApprox(muted, bg, scheme === "dark" ? 0.35 : 0.55),
    foreground: fg,
    muted: surfaceMuted,
    mutedForeground: mixApprox(fg, bg, 0.42),
    surface,
    surfaceForeground: fg,
    surfaceElevated,
    surfaceMuted,
    foregroundSubtle: mixApprox(fg, bg, 0.55),
    border: mixApprox(fg, bg, 0.1),
    borderSubtle: mixApprox(fg, bg, 0.06),
    borderStrong: mixApprox(fg, bg, 0.18),
    primary: accent,
    primaryForeground: accentFg,
    secondary: mixApprox(fg, bg, 0.2),
    secondaryForeground: bg,
    accent,
    accentForeground: accentFg,
    destructive: base.destructive,
    destructiveForeground: base.destructiveForeground,
    success: primitiveColor.success,
    successForeground: base.successForeground,
    warning: primitiveColor.warning,
    warningForeground: base.warningForeground,
  };
}

function isDarkish(hex: string) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : h;
  if (full.length !== 6) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return false;
  // Relative luminance approximation
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l < 0.45;
}

function buildRadius(chrome: ReturnType<typeof applyDesignChrome>): RadiusTokens {
  return {
    none: "0",
    subtle: chrome.radiusSm,
    control: chrome.buttonRadius,
    card: chrome.radiusMd,
    large: chrome.radiusLg,
    pill: "9999px",
  };
}

function buildElevation(
  chrome: ReturnType<typeof applyDesignChrome>,
): DesignTokens["elevation"] {
  return {
    none: "none",
    subtle: chrome.shadowSubtle || primitiveShadow.subtle,
    medium: chrome.shadowCard || primitiveShadow.card,
    strong: chrome.shadowElevated || primitiveShadow.elevated,
  };
}

function buildMotion(reducedMotion: boolean): MotionTokens {
  if (reducedMotion) {
    return {
      instant: "0ms",
      fast: "0.01ms",
      normal: "0.01ms",
      slow: "0.01ms",
      ease: "linear",
      easeOut: "linear",
      easeInOut: "linear",
      reduced: "0.01ms",
    };
  }
  return {
    instant: "0ms",
    fast: primitiveMotion.durationFast,
    normal: primitiveMotion.duration,
    slow: primitiveMotion.durationSlow,
    ease: primitiveMotion.ease,
    easeOut: primitiveMotion.easeOut,
    easeInOut: primitiveMotion.easeInOut,
    reduced: "0.01ms",
  };
}

function buildSpacing(
  sectionPad: string,
  density: "compact" | "comfortable" | "spacious",
): SpacingTokens {
  const factor =
    density === "compact" ? 0.85 : density === "spacious" ? 1.15 : 1;
  const step = (value: string) => {
    if (!value.endsWith("rem") || factor === 1) return value;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return value;
    return `${(n * factor).toFixed(3).replace(/\.?0+$/, "")}rem`;
  };
  return {
    micro: step(spacing.micro),
    tight: step(spacing.tight),
    compact: step(spacing.compact),
    component: step(spacing.component),
    comfortable: step(spacing.comfortable),
    card: step(spacing.card),
    sectionGap: step(spacing.sectionGap),
    section: sectionPad,
    page: step(spacing.page),
  };
}

function resolveVisualPresetId(config: WebsiteConfig): VisualPresetId | null {
  const mood = config.settings.mood;
  if (!mood) return null;
  return getVisualPreset(mood)?.id ?? null;
}

function presetDensity(
  presetId: VisualPresetId | null,
  brandSpacing: "compact" | "comfortable" | "spacious",
): "compact" | "comfortable" | "spacious" {
  if (!presetId) return brandSpacing;
  const preset = getVisualPreset(presetId);
  const hint = preset?.designHints?.spacingDensity;
  if (hint === "compact" || hint === "comfortable" || hint === "spacious") {
    return hint;
  }
  return brandSpacing;
}

/**
 * Resolve the full website design token packet.
 * Does not mutate config. Does not touch editor tokens.
 */
export function resolveDesignTokens(
  config: WebsiteConfig,
  options: ResolveDesignOptions = {},
): DesignTokens {
  const themeMode = normalizeThemeMode(config.settings.themeMode);
  const scheme = resolveColorScheme(themeMode, options.systemPreference);
  const reducedMotion = Boolean(options.reducedMotion);
  const mood = inferStoreMood(config);
  const chrome = applyDesignChrome(moodChrome(mood), config.brand.design);
  const visualPresetId = resolveVisualPresetId(config);
  const density = presetDensity(
    visualPresetId,
    config.brand.design?.sectionSpacing ?? "comfortable",
  );
  const fonts = fontStacks(config.brand.typography);
  const colors = buildColors(config, scheme);

  return {
    scheme,
    themeMode,
    colors,
    typography: buildTypography(config.brand.typography, fonts),
    spacing: buildSpacing(chrome.sectionPad, density),
    radius: buildRadius(chrome),
    elevation: buildElevation(chrome),
    motion: buildMotion(reducedMotion),
    layout: {
      pageMaxWidth: chrome.wrap || primitiveLayout.pageMax,
      contentMaxWidth: primitiveLayout.contentMax,
      readableWidth: "42rem",
      sectionPadding: chrome.sectionPad,
      inlinePadding: primitiveSpace[6],
      gridGap: primitiveSpace[6],
      contentGap: primitiveSpace[4],
      touchMin: primitiveLayout.touchMin,
    },
    fonts,
    visualPresetId,
    reducedMotion,
  };
}

/** Stable key list for completeness tests. */
export const REQUIRED_COLOR_KEYS = [
  "background",
  "backgroundSubtle",
  "surface",
  "surfaceElevated",
  "surfaceMuted",
  "foreground",
  "mutedForeground",
  "foregroundSubtle",
  "border",
  "borderStrong",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
] as const;
