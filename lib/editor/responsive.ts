import type { ResponsiveValue } from "@/lib/store/registry/element-schema";
import {
  isResponsiveBreakpoint,
  type ResponsiveBreakpoint,
} from "@/lib/store/registry/element-schema";

export type ViewportBucket = "desktop" | "tablet" | "mobile";

export function viewportToBreakpoint(
  viewport: ViewportBucket,
): ResponsiveBreakpoint | "base" {
  if (viewport === "desktop") return "desktop";
  return viewport;
}

/**
 * Read effective value with inheritance:
 * mobile → tablet → desktop → base
 * tablet → desktop → base
 * desktop → desktop → base
 *
 * Explicit breakpoint overrides always win over inherited values.
 * Viewport switching is editor UI-only — never call this to mutate WebsiteConfig.
 */
export function resolveResponsiveValue<T>(
  value: T | ResponsiveValue<T> | null | undefined,
  viewport: ViewportBucket,
): {
  value: T | undefined;
  source: "base" | "desktop" | "tablet" | "mobile" | "none";
  inherited: boolean;
} {
  if (value == null) {
    return { value: undefined, source: "none", inherited: false };
  }
  if (!isPlainResponsive(value)) {
    return { value: value as T, source: "base", inherited: false };
  }
  const rv = value as ResponsiveValue<T>;

  const desktopValue =
    rv.desktop !== undefined ? rv.desktop : rv.base;

  if (viewport === "mobile") {
    if (rv.mobile !== undefined) {
      return { value: rv.mobile, source: "mobile", inherited: false };
    }
    if (rv.tablet !== undefined) {
      return { value: rv.tablet, source: "tablet", inherited: true };
    }
    if (desktopValue !== undefined) {
      return {
        value: desktopValue,
        source: rv.desktop !== undefined ? "desktop" : "base",
        inherited: true,
      };
    }
    return { value: undefined, source: "none", inherited: false };
  }

  if (viewport === "tablet") {
    if (rv.tablet !== undefined) {
      return { value: rv.tablet, source: "tablet", inherited: false };
    }
    if (desktopValue !== undefined) {
      return {
        value: desktopValue,
        source: rv.desktop !== undefined ? "desktop" : "base",
        inherited: true,
      };
    }
    return { value: undefined, source: "none", inherited: false };
  }

  // desktop
  if (rv.desktop !== undefined) {
    return { value: rv.desktop, source: "desktop", inherited: false };
  }
  if (rv.base !== undefined) {
    return { value: rv.base, source: "base", inherited: false };
  }
  return { value: undefined, source: "none", inherited: false };
}

/** True when the viewport has its own explicit key (not inherited). */
export function hasExplicitResponsiveOverride(
  value: unknown,
  viewport: ViewportBucket,
): boolean {
  if (value == null || !isPlainResponsive(value)) {
    return viewport === "desktop" && value != null && !isPlainResponsive(value);
  }
  const rv = value as ResponsiveValue<unknown>;
  if (viewport === "desktop") {
    return rv.desktop !== undefined || rv.base !== undefined;
  }
  return rv[viewport] !== undefined;
}

export function setResponsiveOverride<T>(
  current: T | ResponsiveValue<T> | null | undefined,
  viewport: ViewportBucket,
  next: T,
): ResponsiveValue<T> {
  const base =
    current != null && isPlainResponsive(current)
      ? { ...(current as ResponsiveValue<T>) }
      : typeof current === "undefined" || current === null
        ? {}
        : { base: current as T };

  if (viewport === "desktop") {
    // Prefer `desktop` key to match schema defaults; clear legacy `base` alias.
    const { base: _drop, ...rest } = base as ResponsiveValue<T> & {
      base?: T;
    };
    void _drop;
    return { ...rest, desktop: next };
  }
  return { ...base, [viewport]: next };
}

export function resetResponsiveOverride<T>(
  current: T | ResponsiveValue<T> | null | undefined,
  viewport: ViewportBucket,
): T | ResponsiveValue<T> | undefined {
  if (current == null || !isPlainResponsive(current)) {
    return current as T | undefined;
  }
  const next = { ...(current as ResponsiveValue<T>) };
  if (viewport === "desktop") {
    delete (next as { desktop?: T }).desktop;
    delete (next as { base?: T }).base;
  } else {
    delete next[viewport];
  }
  if (
    next.base === undefined &&
    next.desktop === undefined &&
    next.tablet === undefined &&
    next.mobile === undefined
  ) {
    return undefined;
  }
  return next;
}

/**
 * Resolve columns (or similar) for published/CSS use — all breakpoints.
 * Invalid / missing values fall back deterministically (SSR-safe).
 */
export function resolveResponsiveColumns(
  value: unknown,
  fallback: number = 4,
): { mobile: number; tablet: number; desktop: number } {
  const safeFallback = clampColumn(fallback, 4);

  const desktopRaw = resolveResponsiveValue<number>(
    value as number | ResponsiveValue<number>,
    "desktop",
  ).value;
  const desktop = clampColumn(desktopRaw, safeFallback);

  const tabletRaw = resolveResponsiveValue<number>(
    value as number | ResponsiveValue<number>,
    "tablet",
  ).value;
  const tablet = clampColumn(tabletRaw, desktop);

  const mobileRaw = resolveResponsiveValue<number>(
    value as number | ResponsiveValue<number>,
    "mobile",
  ).value;
  const mobile = clampColumn(
    mobileRaw,
    Math.min(2, tablet) as 2 | 3 | 4 | 5 | number,
  );

  return { mobile, tablet, desktop };
}

function clampColumn(n: unknown, fallback: number): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return fallback;
  if (num === 2 || num === 3 || num === 4 || num === 5) return num;
  return fallback;
}

function isPlainResponsive(value: unknown): value is ResponsiveValue<unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidBreakpointKey(key: string): boolean {
  return key === "base" || isResponsiveBreakpoint(key);
}
