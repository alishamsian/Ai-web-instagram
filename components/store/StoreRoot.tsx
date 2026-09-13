"use client";

import type { CSSProperties, ReactNode } from "react";
import type { WebsiteConfig } from "@/types/website";
import { buildStoreTokens, inferStoreMood } from "@/lib/store/theme";
import { cn } from "@/lib/utils";

/**
 * Store design-system root.
 * Injects semantic CSS variables consumed by app/store.css and all Store sections.
 */
export function StoreRoot({
  config,
  children,
  className,
}: {
  config: WebsiteConfig;
  children: ReactNode;
  className?: string;
}) {
  const tokens = buildStoreTokens(config);
  const mood = inferStoreMood(config);
  const scale = config.brand.typography.scale;
  const heading =
    config.brand.typography.heading === "serif"
      ? "store-font-serif"
      : config.brand.typography.heading === "display"
        ? "store-font-display"
        : "store-font-sans";

  const style = {
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
    ["--store-success" as string]: tokens.success,
    ["--store-warning" as string]: tokens.warning,
    ["--store-error" as string]: tokens.error,
    /* legacy aliases used by existing CSS */
    ["--store-muted" as string]: tokens.backgroundSubtle,
    ["--store-muted-fg" as string]: tokens.foregroundMuted,
    ["--store-surface-muted" as string]: tokens.backgroundSubtle,
    ["--store-surface-hover" as string]: tokens.surfaceElevated,
    ["--store-wrap" as string]: "1280px",
    ["--store-space-1" as string]: "0.25rem",
    ["--store-space-2" as string]: "0.5rem",
    ["--store-space-3" as string]: "0.75rem",
    ["--store-space-4" as string]: "1rem",
    ["--store-space-5" as string]: "1.25rem",
    ["--store-space-6" as string]: "1.5rem",
    ["--store-space-8" as string]: "2rem",
    ["--store-space-10" as string]: "2.5rem",
    ["--store-space-12" as string]: "3rem",
    ["--store-space-16" as string]: "4rem",
    ["--store-space-20" as string]: "5rem",
    ["--store-space-24" as string]: "6rem",
    ["--store-space-30" as string]: "7.5rem",
    ["--store-space-40" as string]: "10rem",
    ["--store-section-pad" as string]: tokens.sectionPad,
    ["--store-radius-sm" as string]: tokens.radiusSm,
    ["--store-radius-md" as string]: tokens.radiusMd,
    ["--store-radius-lg" as string]: tokens.radiusLg,
    ["--store-radius-xl" as string]: tokens.radiusXl,
    ["--store-btn-radius" as string]: tokens.buttonRadius,
    ["--store-ratio" as string]: "4 / 5",
    ["--store-ease" as string]: "cubic-bezier(0.22, 1, 0.36, 1)",
    ["--store-dur-fast" as string]: "180ms",
    ["--store-dur" as string]: "280ms",
    ["--store-dur-slow" as string]: "520ms",
    background: tokens.background,
    color: tokens.foreground,
  } as CSSProperties;

  return (
    <div
      className={cn("store", heading, className)}
      data-mood={mood}
      data-scale={scale}
      data-template="store"
      style={style}
      dir={config.settings.direction}
      lang={config.settings.language}
    >
      {children}
    </div>
  );
}
