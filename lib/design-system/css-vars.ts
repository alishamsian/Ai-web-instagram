import type { CSSProperties } from "react";
import type { StoreTokens } from "@/lib/store/theme";
import type { DesignTokens } from "@/lib/design-system/tokens";
import {
  EDITOR_TOKEN_PREFIX,
  SITE_TOKEN_PREFIX,
  STORE_TOKEN_PREFIX,
} from "@/lib/design-system/tokens";
import {
  primitiveLayout,
  primitiveMotion,
  primitiveShadow,
  primitiveSpace,
} from "@/lib/design-system/primitives";
import { imageAspect } from "@/lib/design-system/foundation";

/**
 * Maps semantic StoreTokens → existing `--store-*` CSS variables.
 * Keeps app/store.css and all consumers backward-compatible.
 */
export function storeCssVars(tokens: StoreTokens): CSSProperties {
  return {
    ["--store-bg" as string]: tokens.background,
    ["--store-bg-subtle" as string]: tokens.backgroundSubtle,
    ["--store-surface" as string]: tokens.surface,
    ["--store-surface-elevated" as string]: tokens.surfaceElevated,
    ["--store-fg" as string]: tokens.foreground,
    ["--store-fg-secondary" as string]: tokens.foregroundSecondary,
    ["--store-fg-muted" as string]: tokens.foregroundMuted,
    ["--store-border" as string]: tokens.border,
    ["--store-border-subtle" as string]: tokens.borderSubtle,
    ["--store-border-strong" as string]: tokens.borderStrong,
    ["--store-accent" as string]: tokens.accent,
    ["--store-accent-fg" as string]: tokens.accentForeground,
    ["--store-primary" as string]: tokens.accent,
    ["--store-primary-fg" as string]: tokens.accentForeground,
    ["--store-secondary" as string]: tokens.foreground,
    ["--store-secondary-fg" as string]: tokens.background,
    ["--store-destructive" as string]: tokens.error,
    ["--store-success" as string]: tokens.success,
    ["--store-warning" as string]: tokens.warning,
    ["--store-error" as string]: tokens.error,
    ["--store-muted" as string]: tokens.backgroundSubtle,
    ["--store-muted-fg" as string]: tokens.foregroundMuted,
    ["--store-surface-muted" as string]: tokens.backgroundSubtle,
    ["--store-surface-hover" as string]: tokens.surfaceElevated,
    ["--store-wrap" as string]: tokens.wrap || primitiveLayout.pageMax,
    ["--store-space-1" as string]: primitiveSpace[1],
    ["--store-space-2" as string]: primitiveSpace[2],
    ["--store-space-3" as string]: primitiveSpace[3],
    ["--store-space-4" as string]: primitiveSpace[4],
    ["--store-space-5" as string]: primitiveSpace[5],
    ["--store-space-6" as string]: primitiveSpace[6],
    ["--store-space-8" as string]: primitiveSpace[8],
    ["--store-space-10" as string]: primitiveSpace[10],
    ["--store-space-12" as string]: primitiveSpace[12],
    ["--store-space-16" as string]: primitiveSpace[16],
    ["--store-space-20" as string]: primitiveSpace[20],
    ["--store-space-24" as string]: primitiveSpace[24],
    ["--store-space-30" as string]: primitiveSpace[30],
    ["--store-space-40" as string]: primitiveSpace[40],
    ["--store-section-pad" as string]: tokens.sectionPad,
    ["--store-radius-none" as string]: "0",
    ["--store-radius-sm" as string]: tokens.radiusSm,
    ["--store-radius-md" as string]: tokens.radiusMd,
    ["--store-radius-lg" as string]: tokens.radiusLg,
    ["--store-radius-xl" as string]: tokens.radiusXl,
    ["--store-radius-full" as string]: "9999px",
    ["--store-btn-radius" as string]: tokens.buttonRadius,
    ["--store-ratio" as string]: imageAspect.portrait,
    ["--store-shadow-subtle" as string]: tokens.shadowSubtle || primitiveShadow.subtle,
    ["--store-shadow-card" as string]: tokens.shadowCard || primitiveShadow.card,
    ["--store-shadow-elevated" as string]:
      tokens.shadowElevated || primitiveShadow.elevated,
    ["--store-shadow-overlay" as string]: primitiveShadow.overlay,
    ["--store-ease" as string]: primitiveMotion.ease,
    ["--store-ease-out" as string]: primitiveMotion.easeOut,
    ["--store-ease-in-out" as string]: primitiveMotion.easeInOut,
    ["--store-dur-fast" as string]: primitiveMotion.durationFast,
    ["--store-dur" as string]: primitiveMotion.duration,
    ["--store-dur-slow" as string]: primitiveMotion.durationSlow,
    background: tokens.background,
    color: tokens.foreground,
  };
}

/**
 * Website semantic CSS variables (`--site-*`).
 * Future section variants should prefer these over hardcoded colors.
 * Never emits `--ed-*` editor chrome tokens.
 */
export function siteCssVars(tokens: DesignTokens): CSSProperties {
  const c = tokens.colors;
  const s = tokens.spacing;
  const r = tokens.radius;
  const e = tokens.elevation;
  const m = tokens.motion;
  const l = tokens.layout;
  const f = tokens.fonts;

  return {
    ["--site-color-background" as string]: c.background,
    ["--site-color-background-subtle" as string]: c.backgroundSubtle,
    ["--site-color-surface" as string]: c.surface,
    ["--site-color-surface-elevated" as string]: c.surfaceElevated,
    ["--site-color-surface-muted" as string]: c.surfaceMuted,
    ["--site-color-foreground" as string]: c.foreground,
    ["--site-color-muted" as string]: c.mutedForeground,
    ["--site-color-subtle" as string]: c.foregroundSubtle,
    ["--site-color-border" as string]: c.border,
    ["--site-color-border-subtle" as string]: c.borderSubtle,
    ["--site-color-border-strong" as string]: c.borderStrong,
    ["--site-color-accent" as string]: c.accent,
    ["--site-color-accent-foreground" as string]: c.accentForeground,
    ["--site-color-destructive" as string]: c.destructive,
    ["--site-color-destructive-foreground" as string]: c.destructiveForeground,
    ["--site-color-success" as string]: c.success,
    ["--site-color-success-foreground" as string]: c.successForeground,
    ["--site-color-warning" as string]: c.warning,
    ["--site-color-warning-foreground" as string]: c.warningForeground,

    ["--site-font-display" as string]: f.display,
    ["--site-font-heading" as string]: f.heading,
    ["--site-font-body" as string]: f.body,
    ["--site-font-mono" as string]: f.mono,

    ["--site-type-display-size" as string]: tokens.typography.display.fontSize,
    ["--site-type-heading-size" as string]: tokens.typography.heading.fontSize,
    ["--site-type-body-size" as string]: tokens.typography.body.fontSize,

    ["--site-space-micro" as string]: s.micro,
    ["--site-space-tight" as string]: s.tight,
    ["--site-space-compact" as string]: s.compact,
    ["--site-space-component" as string]: s.component,
    ["--site-space-comfortable" as string]: s.comfortable,
    ["--site-space-card" as string]: s.card,
    ["--site-space-section-gap" as string]: s.sectionGap,
    ["--site-space-section" as string]: s.section,
    ["--site-space-page" as string]: s.page,

    ["--site-radius-none" as string]: r.none,
    ["--site-radius-subtle" as string]: r.subtle,
    ["--site-radius-control" as string]: r.control,
    ["--site-radius-card" as string]: r.card,
    ["--site-radius-large" as string]: r.large,
    ["--site-radius-pill" as string]: r.pill,

    ["--site-elevation-none" as string]: e.none,
    ["--site-elevation-subtle" as string]: e.subtle,
    ["--site-elevation-medium" as string]: e.medium,
    ["--site-elevation-strong" as string]: e.strong,

    ["--site-motion-instant" as string]: m.instant,
    ["--site-motion-fast" as string]: m.fast,
    ["--site-motion-normal" as string]: m.normal,
    ["--site-motion-slow" as string]: m.slow,
    ["--site-motion-ease" as string]: m.ease,
    ["--site-motion-ease-out" as string]: m.easeOut,
    ["--site-motion-ease-in-out" as string]: m.easeInOut,
    ["--site-motion-reduced" as string]: m.reduced,

    ["--site-layout-page-max" as string]: l.pageMaxWidth,
    ["--site-layout-content-max" as string]: l.contentMaxWidth,
    ["--site-layout-readable" as string]: l.readableWidth,
    ["--site-layout-section-pad" as string]: l.sectionPadding,
    ["--site-layout-inline-pad" as string]: l.inlinePadding,
    ["--site-layout-grid-gap" as string]: l.gridGap,
    ["--site-layout-content-gap" as string]: l.contentGap,
    ["--site-layout-touch-min" as string]: l.touchMin,

    ["--site-color-scheme" as string]: tokens.scheme,
  };
}

/** Merge store + site vars for StoreRoot. Site vars never overwrite editor tokens. */
export function websiteCssVars(
  store: StoreTokens,
  design: DesignTokens,
): CSSProperties {
  return {
    ...storeCssVars(store),
    ...siteCssVars(design),
  };
}

/** Test helper — assert no editor token leakage in generated style maps. */
export function assertNoEditorTokenLeakage(
  vars: Record<string, unknown>,
): string[] {
  return Object.keys(vars).filter((key) => key.startsWith(EDITOR_TOKEN_PREFIX));
}

export function isWebsiteTokenName(name: string) {
  return (
    name.startsWith(SITE_TOKEN_PREFIX) || name.startsWith(STORE_TOKEN_PREFIX)
  );
}
