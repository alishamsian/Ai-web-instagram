/**
 * Template category + style metadata (filtering only — no per-category renderers).
 */

import type { TemplateCategory, TemplateStyle } from "@/lib/templates/types";

export const TEMPLATE_CATEGORIES: Array<{
  id: TemplateCategory;
  label: { fa: string; en: string };
}> = [
  { id: "fashion", label: { fa: "فشن", en: "Fashion" } },
  { id: "restaurant", label: { fa: "رستوران", en: "Restaurant" } },
  { id: "saas", label: { fa: "نرم‌افزار", en: "SaaS" } },
  { id: "agency", label: { fa: "آژانس", en: "Agency" } },
  { id: "beauty", label: { fa: "زیبایی", en: "Beauty" } },
  { id: "jewelry", label: { fa: "جواهرات", en: "Jewelry" } },
  { id: "furniture", label: { fa: "مبلمان", en: "Furniture" } },
  { id: "real-estate", label: { fa: "املاک", en: "Real Estate" } },
  { id: "healthcare", label: { fa: "سلامت", en: "Healthcare" } },
  { id: "fitness", label: { fa: "فیتنس", en: "Fitness" } },
  { id: "creator", label: { fa: "کرییتور", en: "Creator" } },
  { id: "portfolio", label: { fa: "پورتفولیو", en: "Portfolio" } },
  { id: "photography", label: { fa: "عکاسی", en: "Photography" } },
  { id: "education", label: { fa: "آموزش", en: "Education" } },
  { id: "legal", label: { fa: "حقوقی", en: "Legal" } },
  { id: "automotive", label: { fa: "خودرو", en: "Automotive" } },
  { id: "coffee", label: { fa: "کافه", en: "Coffee" } },
  { id: "hotel", label: { fa: "هتل", en: "Hotel" } },
  { id: "travel", label: { fa: "سفر", en: "Travel" } },
  { id: "general", label: { fa: "عمومی", en: "General" } },
];

export const TEMPLATE_STYLES: Array<{
  id: TemplateStyle;
  label: { fa: string; en: string };
}> = [
  { id: "minimal", label: { fa: "مینیمال", en: "Minimal" } },
  { id: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
  { id: "luxury", label: { fa: "لوکس", en: "Luxury" } },
  { id: "modern", label: { fa: "مدرن", en: "Modern" } },
  { id: "bold", label: { fa: "جسور", en: "Bold" } },
  { id: "elegant", label: { fa: "ظریف", en: "Elegant" } },
  { id: "playful", label: { fa: "بازیگوش", en: "Playful" } },
  { id: "corporate", label: { fa: "شرکتی", en: "Corporate" } },
  { id: "organic", label: { fa: "ارگانیک", en: "Organic" } },
  { id: "dark", label: { fa: "تیره", en: "Dark" } },
  { id: "light", label: { fa: "روشن", en: "Light" } },
];

export function isTemplateCategory(value: string): value is TemplateCategory {
  return TEMPLATE_CATEGORIES.some((c) => c.id === value);
}

export function isTemplateStyle(value: string): value is TemplateStyle {
  return TEMPLATE_STYLES.some((s) => s.id === value);
}
