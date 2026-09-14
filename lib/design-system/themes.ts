import { sectionRhythm } from "@/lib/design-system/foundation";
import { primitiveRadius } from "@/lib/design-system/primitives";
import type { ColorScheme, ThemeMode } from "@/lib/design-system/tokens";
import type { WebsiteThemeMode } from "@/types/website";

/**
 * Visual mood IDs — preserved for existing configs.
 * Mood ≠ Vertical. Beauty can pair with editorial, luxury, or natural.
 */
export type StoreMood =
  | "luxury"
  | "minimal"
  | "bold"
  | "natural"
  | "editorial"
  | "modern"
  | "dark";

export const STORE_THEME_IDS = [
  "luxury",
  "minimal",
  "bold",
  "natural",
  "editorial",
  "modern",
  "dark",
] as const satisfies readonly StoreMood[];

export type MoodChrome = {
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  sectionPad: string;
  buttonRadius: string;
};

export function moodChrome(mood: StoreMood): MoodChrome {
  switch (mood) {
    case "luxury":
      return {
        radiusSm: primitiveRadius.none,
        radiusMd: "0.15rem",
        radiusLg: "0.25rem",
        radiusXl: "0.4rem",
        sectionPad: sectionRhythm.large,
        buttonRadius: "0.15rem",
      };
    case "bold":
      return {
        radiusSm: "0.2rem",
        radiusMd: "0.4rem",
        radiusLg: "0.65rem",
        radiusXl: "1rem",
        sectionPad: sectionRhythm.medium,
        buttonRadius: "0.35rem",
      };
    case "minimal":
    case "modern":
      return {
        radiusSm: "0.15rem",
        radiusMd: "0.35rem",
        radiusLg: "0.5rem",
        radiusXl: "0.75rem",
        sectionPad: sectionRhythm.medium,
        buttonRadius: "0.35rem",
      };
    case "natural":
      return {
        radiusSm: "0.25rem",
        radiusMd: "0.5rem",
        radiusLg: "0.75rem",
        radiusXl: "1rem",
        sectionPad: sectionRhythm.editorial,
        buttonRadius: "0.5rem",
      };
    case "dark":
      return {
        radiusSm: "0.15rem",
        radiusMd: "0.3rem",
        radiusLg: "0.5rem",
        radiusXl: "0.75rem",
        sectionPad: sectionRhythm.medium,
        buttonRadius: "0.25rem",
      };
    case "editorial":
    default:
      return {
        radiusSm: primitiveRadius.sm,
        radiusMd: primitiveRadius.md,
        radiusLg: primitiveRadius.lg,
        radiusXl: primitiveRadius.xl,
        sectionPad: sectionRhythm.editorial,
        buttonRadius: "0.2rem",
      };
  }
}

/**
 * Intentional light / dark semantic bases — not naive inversions.
 * Brand colors overlay these; avoid pure #000 / #fff as defaults.
 */
export const LIGHT_THEME_BASE = {
  background: "#f7f5f2",
  backgroundSubtle: "#efebe6",
  surface: "#fcfbf9",
  surfaceElevated: "#ffffff",
  surfaceMuted: "#f0ece7",
  foreground: "#1a1816",
  foregroundMuted: "#6b6560",
  foregroundSubtle: "#918a83",
  border: "rgba(26, 24, 22, 0.1)",
  borderSubtle: "rgba(26, 24, 22, 0.06)",
  borderStrong: "rgba(26, 24, 22, 0.18)",
  accent: "#2f5d50",
  accentForeground: "#f7f5f2",
  destructive: "#a33b32",
  destructiveForeground: "#faf7f5",
  success: "#2f6b4f",
  successForeground: "#f4faf6",
  warning: "#9a5b12",
  warningForeground: "#fff8ef",
} as const;

export const DARK_THEME_BASE = {
  background: "#121314",
  backgroundSubtle: "#1a1b1d",
  surface: "#1c1d1f",
  surfaceElevated: "#242628",
  surfaceMuted: "#18191b",
  foreground: "#eceae6",
  foregroundMuted: "#a39e97",
  foregroundSubtle: "#7a756f",
  border: "rgba(236, 234, 230, 0.1)",
  borderSubtle: "rgba(236, 234, 230, 0.06)",
  borderStrong: "rgba(236, 234, 230, 0.18)",
  accent: "#7eb8a8",
  accentForeground: "#101413",
  destructive: "#e07a72",
  destructiveForeground: "#1a1010",
  success: "#6fbf95",
  successForeground: "#0f1a14",
  warning: "#d4a35c",
  warningForeground: "#1a140c",
} as const;

export function themeBaseForScheme(scheme: ColorScheme) {
  return scheme === "dark" ? DARK_THEME_BASE : LIGHT_THEME_BASE;
}

/** Normalize persisted / unknown themeMode with safe default. */
export function normalizeThemeMode(
  value: WebsiteThemeMode | ThemeMode | string | null | undefined,
): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "light";
}

/**
 * Resolve effective color scheme.
 * - explicit light/dark → deterministic
 * - system → uses preference when provided; otherwise light (SSR-safe, no window)
 */
export function resolveColorScheme(
  themeMode: WebsiteThemeMode | ThemeMode | string | null | undefined,
  systemPreference?: ColorScheme | null,
): ColorScheme {
  const mode = normalizeThemeMode(themeMode);
  if (mode === "light" || mode === "dark") return mode;
  return systemPreference === "dark" ? "dark" : "light";
}
