import type { ColorConfig, TypographyConfig, WebsiteConfig } from "@/types/website";

export type DesignPresetId =
  | "minimal"
  | "luxury"
  | "editorial"
  | "bold"
  | "natural"
  | "modern"
  | "dark";

export interface DesignPreset {
  id: DesignPresetId;
  label: { fa: string; en: string };
  description: { fa: string; en: string };
  colors: ColorConfig;
  typography: TypographyConfig;
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
  },
  {
    id: "modern",
    label: { fa: "مدرن", en: "Modern" },
    description: { fa: "خنک و دقیق", en: "Cool and precise" },
    colors: {
      primary: "#0F172A",
      secondary: "#F8FAFC",
      accent: "#0F766E",
      background: "#F8FAFC",
      foreground: "#0F172A",
      muted: "#E2E8F0",
    },
    typography: { heading: "sans", body: "sans", scale: "compact" },
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
  },
];

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
    },
  };
}

export const SECTION_LIBRARY: {
  type: WebsiteConfig["sections"][number]["type"];
  category: "featured" | "commerce" | "content" | "media" | "social" | "conversion" | "navigation";
  label: { fa: string; en: string };
  description: { fa: string; en: string };
}[] = [
  {
    type: "hero",
    category: "featured",
    label: { fa: "هیرو", en: "Hero" },
    description: { fa: "تیتر اصلی و تصویر برند", en: "Primary headline and brand image" },
  },
  {
    type: "products",
    category: "commerce",
    label: { fa: "محصولات", en: "Products" },
    description: { fa: "شبکه محصولات فروشگاه", en: "Product grid for the shop" },
  },
  {
    type: "about",
    category: "content",
    label: { fa: "درباره / داستان برند", en: "About / Brand story" },
    description: { fa: "روایت کوتاه برند", en: "Short brand narrative" },
  },
  {
    type: "gallery",
    category: "media",
    label: { fa: "گالری", en: "Gallery" },
    description: { fa: "نمایش تصاویر و لوک‌بوک", en: "Lookbook and image showcase" },
  },
  {
    type: "instagram-feed",
    category: "media",
    label: { fa: "فید اینستاگرام", en: "Instagram feed" },
    description: { fa: "نمایش پست‌های اینستا", en: "Surface Instagram posts" },
  },
  {
    type: "testimonials",
    category: "social",
    label: { fa: "نظرات", en: "Testimonials" },
    description: { fa: "گواهی مشتریان", en: "Customer social proof" },
  },
  {
    type: "faq",
    category: "content",
    label: { fa: "پرسش‌ها", en: "FAQ" },
    description: { fa: "سوالات پرتکرار", en: "Common questions" },
  },
  {
    type: "contact",
    category: "conversion",
    label: { fa: "تماس", en: "Contact" },
    description: { fa: "راه‌های ارتباط", en: "Ways to reach you" },
  },
  {
    type: "cta",
    category: "conversion",
    label: { fa: "فراخوان", en: "CTA" },
    description: { fa: "بنر دعوت به اقدام", en: "Call-to-action banner" },
  },
  {
    type: "services",
    category: "commerce",
    label: { fa: "خدمات", en: "Services" },
    description: { fa: "لیست خدمات", en: "Service offerings" },
  },
  {
    type: "footer",
    category: "navigation",
    label: { fa: "فوتر", en: "Footer" },
    description: { fa: "پایان صفحه و لینک‌ها", en: "Page footer and links" },
  },
];
