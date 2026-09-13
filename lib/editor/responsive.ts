import type { ResponsiveValue } from "@/lib/store/registry/element-schema";
import {
  isResponsiveBreakpoint,
  type ResponsiveBreakpoint,
} from "@/lib/store/registry/element-schema";

export type ViewportBucket = "desktop" | "tablet" | "mobile";

export function viewportToBreakpoint(
  viewport: ViewportBucket,
): ResponsiveBreakpoint | "base" {
  if (viewport === "desktop") return "base";
  return viewport;
}

/**
 * Read effective value with inheritance:
 * mobile → tablet → base
 */
export function resolveResponsiveValue<T>(
  value: T | ResponsiveValue<T> | null | undefined,
  viewport: ViewportBucket,
): { value: T | undefined; source: "base" | "tablet" | "mobile" | "none"; inherited: boolean } {
  if (value == null) {
    return { value: undefined, source: "none", inherited: false };
  }
  if (!isPlainResponsive(value)) {
    return { value: value as T, source: "base", inherited: false };
  }
  const rv = value as ResponsiveValue<T>;
  if (viewport === "mobile") {
    if (rv.mobile !== undefined) {
      return { value: rv.mobile, source: "mobile", inherited: false };
    }
    if (rv.tablet !== undefined) {
      return { value: rv.tablet, source: "tablet", inherited: true };
    }
    return { value: rv.base, source: "base", inherited: true };
  }
  if (viewport === "tablet") {
    if (rv.tablet !== undefined) {
      return { value: rv.tablet, source: "tablet", inherited: false };
    }
    return { value: rv.base, source: "base", inherited: true };
  }
  return { value: rv.base, source: "base", inherited: false };
}

export function setResponsiveOverride<T>(
  current: T | ResponsiveValue<T> | null | undefined,
  viewport: ViewportBucket,
  next: T,
): ResponsiveValue<T> {
  const base =
    current != null && isPlainResponsive(current)
      ? { ...(current as ResponsiveValue<T>) }
      : { base: current as T | undefined };

  if (viewport === "desktop") {
    return { ...base, base: next };
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
    // Resetting desktop clears base but keeps overrides uncommon — keep base undefined
    delete (next as { base?: T }).base;
  } else {
    delete next[viewport];
  }
  if (next.base === undefined && next.tablet === undefined && next.mobile === undefined) {
    return undefined;
  }
  return next;
}

function isPlainResponsive(value: unknown): value is ResponsiveValue<unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isValidBreakpointKey(key: string): boolean {
  return key === "base" || isResponsiveBreakpoint(key);
}
