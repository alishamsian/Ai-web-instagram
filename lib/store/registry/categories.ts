import type { SectionCategory } from "@/lib/store/registry/types";

/** Single source for Section Library chips + Registry filters. */
export const SECTION_CATEGORIES: {
  id: SectionCategory;
  fa: string;
  en: string;
}[] = [
  { id: "featured", fa: "ویژه", en: "Featured" },
  { id: "commerce", fa: "فروش", en: "Commerce" },
  { id: "content", fa: "محتوا", en: "Content" },
  { id: "media", fa: "رسانه", en: "Media" },
  { id: "editorial", fa: "ادیتوریال", en: "Editorial" },
  { id: "social", fa: "اعتبار اجتماعی", en: "Social proof" },
  { id: "conversion", fa: "تبدیل", en: "Conversion" },
  { id: "navigation", fa: "ناوبری", en: "Navigation" },
];
