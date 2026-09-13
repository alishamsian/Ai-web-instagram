/**
 * Semantic color roles for multi-theme ecommerce.
 * Vertical-specific colors must map onto these — never into core DS names.
 */

export type SemanticColorTokens = {
  background: string;
  backgroundSubtle: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  surface: string;
  surfaceForeground: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  success: string;
  warning: string;
};

export type SemanticBorderTokens = {
  subtle: string;
  default: string;
  strong: string;
};

export type SemanticShadowTokens = {
  none: string;
  subtle: string;
  card: string;
  elevated: string;
  overlay: string;
};

export type SemanticRadiusTokens = {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
};

export type SemanticMotionTokens = {
  fast: string;
  normal: string;
  slow: string;
  ease: string;
  easeOut: string;
  easeInOut: string;
};
