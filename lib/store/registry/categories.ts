import type { SectionCategory } from "@/lib/store/registry/types";

/** Single source for Section Library chips + Registry filters. */
export const SECTION_CATEGORIES: {
  id: SectionCategory;
  fa: string;
  en: string;
}[] = [
  { id: "featured", fa: "هیرو و ویژه", en: "Hero & featured" },
  { id: "commerce", fa: "فروش و محصولات", en: "Commerce" },
  { id: "content", fa: "درباره و محتوا", en: "About & content" },
  { id: "media", fa: "گالری و رسانه", en: "Gallery & media" },
  { id: "editorial", fa: "ادیتوریال", en: "Editorial" },
  { id: "social", fa: "نظرات و اعتماد", en: "Testimonials" },
  { id: "conversion", fa: "CTA و تماس", en: "CTA & contact" },
  { id: "navigation", fa: "فوتر و ناوبری", en: "Footer & nav" },
];
