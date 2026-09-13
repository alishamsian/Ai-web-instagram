import {
  primitiveMotion,
  primitiveRadius,
  primitiveShadow,
} from "@/lib/design-system/primitives";
import type {
  SemanticMotionTokens,
  SemanticRadiusTokens,
  SemanticShadowTokens,
} from "@/lib/design-system/semantic";

export const radius: SemanticRadiusTokens = {
  none: primitiveRadius.none,
  sm: primitiveRadius.sm,
  md: primitiveRadius.md,
  lg: primitiveRadius.lg,
  xl: primitiveRadius.xl,
  full: primitiveRadius.full,
};

export const shadows: SemanticShadowTokens = {
  none: primitiveShadow.none,
  subtle: primitiveShadow.subtle,
  card: primitiveShadow.card,
  elevated: primitiveShadow.elevated,
  overlay: primitiveShadow.overlay,
};

export const motion: SemanticMotionTokens = {
  fast: primitiveMotion.durationFast,
  normal: primitiveMotion.duration,
  slow: primitiveMotion.durationSlow,
  ease: primitiveMotion.ease,
  easeOut: primitiveMotion.easeOut,
  easeInOut: primitiveMotion.easeInOut,
};

/** Image aspect vocabulary — verticals pick; DS does not force one ratio. */
export const imageAspect = {
  square: "1 / 1",
  portrait: "4 / 5",
  landscape: "3 / 2",
  editorial: "3 / 4",
  tall: "3 / 5",
  wide: "16 / 9",
} as const;

export type ImageAspectKey = keyof typeof imageAspect;

/** Section vertical rhythm — avoid identical heading+cards everywhere. */
export const sectionRhythm = {
  small: "clamp(2rem, 5vw, 3.5rem)",
  medium: "clamp(3rem, 7vw, 5.5rem)",
  large: "clamp(3.5rem, 8vw, 6.5rem)",
  editorial: "clamp(3.25rem, 7.5vw, 6rem)",
  fullBleed: "0",
} as const;

export type SectionRhythmKey = keyof typeof sectionRhythm;
