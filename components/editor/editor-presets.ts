import type {
  BrandDesignConfig,
  ColorConfig,
  TypographyConfig,
  WebsiteConfig,
} from "@/types/website";

export type DesignPresetId =
  | "minimal"
  | "luxury"
  | "editorial"
  | "bold"
  | "natural"
  | "modern"
  | "dark"
  | "soft";

export interface DesignPreset {
  id: DesignPresetId;
  label: { fa: string; en: string };
  description: { fa: string; en: string };
  colors: ColorConfig;
  typography: TypographyConfig;
  design: Required<BrandDesignConfig>;
  /** Maps to settings.mood / Store chrome */
  mood: NonNullable<WebsiteConfig["settings"]["mood"]>;
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "minimal",
    label: { fa: "مینیمال", en: "Minimal" },
    description: { fa: "سفید، تمیز، بدون شلوغی", en: "Clean whites and quiet type" },
    colors: {
      primary: "#111111",
      secondary: "#FFFFFF",
      accent: "#2A2A2A",
      background: "#FAFAFA",
      foreground: "#111111",
      muted: "#EEEEEE",
    },
    typography: { heading: "sans", body: "sans", scale: "compact" },
    design: {
      contentWidth: "default",
      sectionSpacing: "comfortable",
      radius: "soft",
      shadow: "subtle",
    },
    mood: "minimal",
  },
  {
    id: "soft",
    label: { fa: "نرم", en: "Soft" },
    description: { fa: "سطوح ملایم و فاصله باز", en: "Gentle surfaces and open rhythm" },
    colors: {
      primary: "#2C2A28",
      secondary: "#FBF8F4",
      accent: "#9A7B6A",
      background: "#FBF8F4",
      foreground: "#2C2A28",
      muted: "#EFEAE3",
    },
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    design: {
      contentWidth: "narrow",
      sectionSpacing: "spacious",
      radius: "rounded",
      shadow: "subtle",
    },
    mood: "natural",
  },
  {
    id: "luxury",
    label: { fa: "لوکس", en: "Luxury" },
    description: { fa: "تیره با طلایی گرم", en: "Dark with warm gold accent" },
    colors: {
      primary: "#F5F5F5",
      secondary: "#0A0A0A",
      accent: "#D4A373",
      background: "#0A0A0A",
      foreground: "#F5F5F5",
      muted: "#1A1A1A",
    },
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    design: {
      contentWidth: "narrow",
      sectionSpacing: "spacious",
      radius: "sharp",
      shadow: "elevated",
    },
    mood: "luxury",
  },
  {
    id: "editorial",
    label: { fa: "ادیتوریال", en: "Editorial" },
    description: { fa: "کاغذی و مجله‌ای", en: "Magazine-like paper tones" },
    colors: {
      primary: "#1C1917",
      secondary: "#F7F3EE",
      accent: "#A67C52",
      background: "#F7F3EE",
      foreground: "#1C1917",
      muted: "#EDE7DF",
    },
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    design: {
      contentWidth: "default",
      sectionSpacing: "spacious",
      radius: "sharp",
      shadow: "subtle",
    },
    mood: "editorial",
  },
  {
    id: "bold",
    label: { fa: "پررنگ", en: "Bold" },
    description: { fa: "کنتراست بالا و جسور", en: "High contrast and punchy" },
    colors: {
      primary: "#0B0B0B",
      secondary: "#FFFFFF",
      accent: "#FF6B57",
      background: "#FFFFFF",
      foreground: "#0B0B0B",
      muted: "#F0F0F0",
    },
    typography: { heading: "display", body: "sans", scale: "bold" },
    design: {
      contentWidth: "wide",
      sectionSpacing: "comfortable",
      radius: "rounded",
      shadow: "none",
    },
    mood: "bold",
  },
  {
    id: "natural",
    label: { fa: "طبیعی", en: "Natural" },
    description: { fa: "سبز آرام و خاکی", en: "Soft greens and earth" },
    colors: {
      primary: "#1F2A24",
      secondary: "#F6F4EF",
      accent: "#5F7A64",
      background: "#F6F4EF",
      foreground: "#1F2A24",
      muted: "#E8E4DC",
    },
    typography: { heading: "serif", body: "sans", scale: "editorial" },
    design: {
      contentWidth: "default",
      sectionSpacing: "comfortable",
      radius: "rounded",
      shadow: "subtle",
    },
    mood: "natural",
  },
  {
    id: "modern",
    label: { fa: "استودیو", en: "Studio" },
    description: { fa: "خنک، دقیق، حرفه‌ای", en: "Cool, precise, professional" },
    colors: {
      primary: "#0F172A",
      secondary: "#F8FAFC",
      accent: "#0F766E",
      background: "#F8FAFC",
      foreground: "#0F172A",
      muted: "#E2E8F0",
    },
    typography: { heading: "sans", body: "sans", scale: "compact" },
    design: {
      contentWidth: "default",
      sectionSpacing: "compact",
      radius: "soft",
      shadow: "subtle",
    },
    mood: "modern",
  },
  {
    id: "dark",
    label: { fa: "تیره", en: "Dark" },
    description: { fa: "شب و نور ملایم", en: "Night with soft highlights" },
    colors: {
      primary: "#F7F7F8",
      secondary: "#080808",
      accent: "#FF6B57",
      background: "#080808",
      foreground: "#F7F7F8",
      muted: "#161618",
    },
    typography: { heading: "sans", body: "sans", scale: "bold" },
    design: {
      contentWidth: "default",
      sectionSpacing: "comfortable",
      radius: "soft",
      shadow: "elevated",
    },
    mood: "dark",
  },
];

/** Applies theme values only — never destroys content. */
export function applyDesignPreset(
  config: WebsiteConfig,
  presetId: DesignPresetId,
): WebsiteConfig {
  const preset = DESIGN_PRESETS.find((item) => item.id === presetId);
  if (!preset) return config;
  return {
    ...config,
    brand: {
      ...config.brand,
      colors: { ...preset.colors },
      typography: { ...preset.typography },
      design: { ...preset.design },
    },
    settings: {
      ...config.settings,
      mood: preset.mood,
    },
  };
}

export { getSectionLibraryItems as getSectionLibrary } from "@/lib/store/registry/library-adapter";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";

/** @deprecated Prefer getSectionLibraryItems() — kept for existing imports. */
export const SECTION_LIBRARY = getSectionLibraryItems();
