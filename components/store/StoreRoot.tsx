"use client";

import type { CSSProperties, ReactNode } from "react";
import type { WebsiteConfig } from "@/types/website";
import { buildStoreTokens, inferStoreMood } from "@/lib/store/theme";
import { cn } from "@/lib/utils";

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
  const heading =
    config.brand.typography.heading === "serif"
      ? "store-font-serif"
      : config.brand.typography.heading === "display"
        ? "store-font-display"
        : "store-font-sans";

  const style = {
    ["--store-bg" as string]: tokens.background,
    ["--store-fg" as string]: tokens.foreground,
    ["--store-muted" as string]: tokens.muted,
    ["--store-muted-fg" as string]: tokens.mutedFg,
    ["--store-surface" as string]: tokens.surface,
    ["--store-surface-hover" as string]: tokens.surfaceHover,
    ["--store-border" as string]: tokens.border,
    ["--store-accent" as string]: tokens.accent,
    ["--store-accent-fg" as string]: tokens.accentFg,
    ["--store-success" as string]: tokens.success,
    background: tokens.background,
    color: tokens.foreground,
  } as CSSProperties;

  return (
    <div
      className={cn("store", heading, className)}
      data-mood={mood}
      data-template="store"
      style={style}
      dir={config.settings.direction}
      lang={config.settings.language}
    >
      {children}
    </div>
  );
}
