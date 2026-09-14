"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { WebsiteConfig } from "@/types/website";
import { buildStoreTokens, inferStoreMood } from "@/lib/store/theme";
import {
  normalizeThemeMode,
  resolveDesignTokens,
  websiteCssVars,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

/**
 * Store design-system root.
 * Injects `--store-*` (legacy) + `--site-*` (semantic foundation) CSS variables.
 * Editor chrome tokens (`--ed-*`) are never emitted here.
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
  const themeMode = normalizeThemeMode(config.settings.themeMode);
  const [systemPreference, setSystemPreference] = useState<
    "light" | "dark" | null
  >(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (themeMode !== "system") {
      setSystemPreference(null);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemPreference(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [themeMode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const storeTokens = buildStoreTokens(config, {
    systemPreference: themeMode === "system" ? systemPreference : null,
  });
  const design = resolveDesignTokens(config, {
    systemPreference: themeMode === "system" ? systemPreference : null,
    reducedMotion,
  });
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
      data-theme-mode={design.themeMode}
      data-color-scheme={design.scheme}
      data-reduced-motion={design.reducedMotion ? "true" : "false"}
      data-visual-preset={design.visualPresetId ?? undefined}
      style={websiteCssVars(storeTokens, design)}
      dir={config.settings.direction}
      lang={config.settings.language}
    >
      {children}
    </div>
  );
}
