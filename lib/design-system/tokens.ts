/**
 * Design token contracts — website visual system only.
 * Editor chrome (`--ed-*`) is intentionally excluded.
 *
 * Layers (conceptual):
 * A. primitives (raw) → B. semantic → C. theme → D. brand → E. components
 */

import type { SemanticColorTokens } from "@/lib/design-system/semantic";

/** Resolved color scheme after themeMode resolution. */
export type ColorScheme = "light" | "dark";

/** Website theme intent (persisted on WebsiteSettings). */
export type ThemeMode = "light" | "dark" | "system";

/**
 * Full website color surface for DesignTokens.
 * Extends Store semantic colors with muted/subtle/state foregrounds.
 */
export type WebsiteColorTokens = SemanticColorTokens & {
  surfaceMuted: string;
  foregroundSubtle: string;
  destructiveForeground: string;
  successForeground: string;
  warningForeground: string;
};

export type TypographyRoleToken = {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: number | string;
};

/** Compact typography personality roles for future presets. */
export type TypographyTokens = {
  display: TypographyRoleToken;
  heading: TypographyRoleToken;
  subheading: TypographyRoleToken;
  body: TypographyRoleToken;
  bodySmall: TypographyRoleToken;
  caption: TypographyRoleToken;
  label: TypographyRoleToken;
  button: TypographyRoleToken;
};

export type SpacingTokens = {
  micro: string;
  tight: string;
  compact: string;
  component: string;
  comfortable: string;
  card: string;
  sectionGap: string;
  section: string;
  page: string;
};

/** Semantic radius roles — map personalities without hardcoding per component. */
export type RadiusTokens = {
  none: string;
  subtle: string;
  control: string;
  card: string;
  large: string;
  pill: string;
};

export type ElevationTokens = {
  none: string;
  subtle: string;
  medium: string;
  strong: string;
};

export type MotionTokens = {
  instant: string;
  fast: string;
  normal: string;
  slow: string;
  ease: string;
  easeOut: string;
  easeInOut: string;
  /** When prefers-reduced-motion is on, non-essential motion should use this. */
  reduced: string;
};

export type LayoutTokens = {
  pageMaxWidth: string;
  contentMaxWidth: string;
  readableWidth: string;
  sectionPadding: string;
  inlinePadding: string;
  gridGap: string;
  contentGap: string;
  touchMin: string;
};

/** Safe font stacks — no download; RTL-friendly fallbacks included. */
export type FontStackTokens = {
  display: string;
  heading: string;
  body: string;
  mono: string;
};

/**
 * Normalized design packet consumed by CSS var generators and future sections.
 * Deterministic given identical inputs.
 */
export type DesignTokens = {
  scheme: ColorScheme;
  themeMode: ThemeMode;
  colors: WebsiteColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  elevation: ElevationTokens;
  motion: MotionTokens;
  layout: LayoutTokens;
  fonts: FontStackTokens;
  /** Visual preset id when mood matches a known preset; otherwise null. */
  visualPresetId: string | null;
  /** Accessibility / motion preference hint (runtime may override). */
  reducedMotion: boolean;
};

/** Editor tokens namespace — documented boundary, never emitted as --site-*. */
export const EDITOR_TOKEN_PREFIX = "--ed-" as const;
export const SITE_TOKEN_PREFIX = "--site-" as const;
export const STORE_TOKEN_PREFIX = "--store-" as const;
