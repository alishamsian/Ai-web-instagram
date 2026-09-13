"use client";

import type { ReactNode } from "react";
import type { WebsiteConfig } from "@/types/website";
import { buildStoreTokens, inferStoreMood } from "@/lib/store/theme";
import { storeCssVars } from "@/lib/design-system/css-vars";
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

  return (
    <div
      className={cn("store", heading, className)}
      data-mood={mood}
      data-scale={scale}
      data-template="store"
      style={storeCssVars(tokens)}
      dir={config.settings.direction}
      lang={config.settings.language}
    >
      {children}
    </div>
  );
}
