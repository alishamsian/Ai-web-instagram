"use client";

import {
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { WebsiteConfig } from "@/types/website";
import { buildStoreTokens, inferStoreMood } from "@/lib/store/theme";
import {
  normalizeThemeMode,
  resolveDesignTokens,
  websiteCssVars,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

function subscribeColorScheme(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getColorSchemeSnapshot(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** SSR + first hydration snapshot — deterministic, no window. */
function getServerColorSchemeSnapshot(): "light" | "dark" {
  return "light";
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

/**
 * Store design-system root.
 * Injects `--store-*` (legacy) + `--site-*` (semantic foundation) CSS variables.
 * Editor chrome tokens (`--ed-*`) are never emitted here.
 *
 * System theme: SSR-safe light fallback via useSyncExternalStore getServerSnapshot.
 * Avoids hydration mismatch; client preference applies after hydration.
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
  const systemPreference = useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    getServerColorSchemeSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );

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
