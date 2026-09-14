import type {
  BrandDesignConfig,
  DesignContentWidth,
  DesignRadius,
  DesignSectionSpacing,
  DesignShadow,
  WebsiteConfig,
} from "@/types/website";
import { sectionRhythm } from "@/lib/design-system/foundation";
import {
  primitiveLayout,
  primitiveShadow,
} from "@/lib/design-system/primitives";
import type { MoodChrome } from "@/lib/design-system/themes";

export const DEFAULT_BRAND_DESIGN: Required<BrandDesignConfig> = {
  contentWidth: "default",
  sectionSpacing: "comfortable",
  radius: "soft",
  shadow: "subtle",
};

export function resolveBrandDesign(
  config: WebsiteConfig,
): Required<BrandDesignConfig> {
  const d = config.brand.design;
  return {
    contentWidth: d?.contentWidth ?? DEFAULT_BRAND_DESIGN.contentWidth,
    sectionSpacing: d?.sectionSpacing ?? DEFAULT_BRAND_DESIGN.sectionSpacing,
    radius: d?.radius ?? DEFAULT_BRAND_DESIGN.radius,
    shadow: d?.shadow ?? DEFAULT_BRAND_DESIGN.shadow,
  };
}

export function contentWidthCss(width: DesignContentWidth): string {
  switch (width) {
    case "narrow":
      return "72rem";
    case "wide":
      return primitiveLayout.wideMax;
    default:
      return primitiveLayout.pageMax;
  }
}

export function sectionSpacingCss(spacing: DesignSectionSpacing): string {
  switch (spacing) {
    case "compact":
      return sectionRhythm.small;
    case "spacious":
      return sectionRhythm.large;
    default:
      return sectionRhythm.medium;
  }
}

export function radiusChrome(radius: DesignRadius): Pick<
  MoodChrome,
  "radiusSm" | "radiusMd" | "radiusLg" | "radiusXl" | "buttonRadius"
> {
  switch (radius) {
    case "sharp":
      return {
        radiusSm: "0",
        radiusMd: "0.1rem",
        radiusLg: "0.2rem",
        radiusXl: "0.3rem",
        buttonRadius: "0.1rem",
      };
    case "rounded":
      return {
        radiusSm: "0.35rem",
        radiusMd: "0.65rem",
        radiusLg: "0.9rem",
        radiusXl: "1.15rem",
        buttonRadius: "0.75rem",
      };
    default:
      return {
        radiusSm: "0.15rem",
        radiusMd: "0.35rem",
        radiusLg: "0.5rem",
        radiusXl: "0.75rem",
        buttonRadius: "0.35rem",
      };
  }
}

export function shadowCss(shadow: DesignShadow): {
  subtle: string;
  card: string;
  elevated: string;
} {
  switch (shadow) {
    case "none":
      return { subtle: "none", card: "none", elevated: "none" };
    case "elevated":
      return {
        subtle: primitiveShadow.card,
        card: primitiveShadow.elevated,
        elevated: primitiveShadow.overlay,
      };
    default:
      return {
        subtle: primitiveShadow.subtle,
        card: primitiveShadow.card,
        elevated: primitiveShadow.elevated,
      };
  }
}

/** Merge mood chrome with optional brand.design overrides (backward compatible). */
export function applyDesignChrome(
  moodChrome: MoodChrome,
  design: BrandDesignConfig | undefined,
): MoodChrome & { wrap: string; shadowSubtle: string; shadowCard: string; shadowElevated: string } {
  const resolved = {
    ...DEFAULT_BRAND_DESIGN,
    ...design,
  };
  const radius = design?.radius ? radiusChrome(resolved.radius) : null;
  const pad = design?.sectionSpacing
    ? sectionSpacingCss(resolved.sectionSpacing)
    : moodChrome.sectionPad;
  const shadows = shadowCss(resolved.shadow);
  return {
    ...moodChrome,
    ...(radius ?? {}),
    sectionPad: pad,
    wrap: contentWidthCss(resolved.contentWidth),
    shadowSubtle: shadows.subtle,
    shadowCard: shadows.card,
    shadowElevated: shadows.elevated,
  };
}
