import { sectionRhythm } from "@/lib/design-system/foundation";
import { primitiveRadius } from "@/lib/design-system/primitives";

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
