/**
 * Design System — primitive tokens (raw values).
 * Semantic meaning lives in semantic.ts / themes map these onto CSS vars.
 */

export const primitiveColor = {
  white: "#ffffff",
  black: "#0a0a0a",
  /** Fallback store neutrals (overridden per brand at runtime) */
  warmBg: "#f7f3ee",
  warmBgSubtle: "#efe9e1",
  warmSurface: "#fcfaf7",
  warmFg: "#1c1916",
  warmFgSecondary: "#4a453f",
  warmFgMuted: "#7a736a",
  warmAccent: "#8b6b4a",
  warmAccentFg: "#faf7f2",
  success: "#2f6b4f",
  warning: "#b45309",
  error: "#b42318",
  luxuryMix: "#8b7355",
} as const;

/** 4px-based scale used by Store CSS (`--store-space-*`). */
export const primitiveSpace = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  30: "7.5rem",
  40: "10rem",
} as const;

export const primitiveRadius = {
  none: "0",
  sm: "0.1rem",
  md: "0.25rem",
  lg: "0.4rem",
  xl: "0.65rem",
  full: "9999px",
} as const;

export const primitiveShadow = {
  none: "none",
  subtle: "0 1px 2px color-mix(in srgb, var(--store-fg) 6%, transparent)",
  card: "0 8px 24px color-mix(in srgb, var(--store-fg) 6%, transparent)",
  elevated: "0 16px 40px color-mix(in srgb, var(--store-fg) 10%, transparent)",
  overlay: "0 24px 64px color-mix(in srgb, var(--store-fg) 18%, transparent)",
} as const;

export const primitiveMotion = {
  durationFast: "180ms",
  duration: "280ms",
  durationSlow: "520ms",
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeInOut: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

/** Design breakpoints (px). Mobile / tablet / desktop map onto these. */
export const primitiveBreakpoint = {
  xs: 360,
  sm: 390,
  md: 430,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1440,
  ultrawide: 1920,
} as const;

export const primitiveLayout = {
  pageMax: "1280px",
  contentMax: "72rem",
  wideMax: "1440px",
  headerHeight: "3.75rem",
  headerHeightLg: "4.25rem",
  touchMin: "44px",
  gridColumns: 12,
} as const;
