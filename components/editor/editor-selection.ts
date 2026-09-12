import type { EditorFieldPath } from "@/components/editor/EditContext";
import type { WebsiteSectionType } from "@/types/website";

export type LayerBlock = {
  id: string;
  label: { fa: string; en: string };
  field?: EditorFieldPath;
};

export const SECTION_LAYER_BLOCKS: Record<string, LayerBlock[]> = {
  hero: [
    { id: "heading", label: { fa: "تیتر", en: "Heading" }, field: "hero.headline" },
    { id: "description", label: { fa: "توضیح", en: "Description" }, field: "hero.subheadline" },
    { id: "cta", label: { fa: "دکمه اصلی", en: "Primary button" }, field: "hero.cta" },
    { id: "image", label: { fa: "تصویر", en: "Image" } },
  ],
  products: [
    { id: "title", label: { fa: "عنوان", en: "Title" }, field: "products.title" },
    { id: "cards", label: { fa: "کارت محصولات", en: "Product cards" } },
  ],
  about: [
    { id: "heading", label: { fa: "عنوان", en: "Heading" }, field: "about.title" },
    { id: "body", label: { fa: "متن", en: "Body" }, field: "about.body" },
    { id: "image", label: { fa: "تصویر", en: "Image" } },
  ],
  gallery: [
    { id: "title", label: { fa: "عنوان", en: "Title" }, field: "gallery.title" },
    { id: "images", label: { fa: "تصاویر", en: "Images" } },
  ],
  testimonials: [
    { id: "title", label: { fa: "عنوان", en: "Title" }, field: "testimonials.title" },
    { id: "quotes", label: { fa: "نقل‌قول‌ها", en: "Quotes" } },
  ],
  faq: [
    { id: "title", label: { fa: "عنوان", en: "Title" }, field: "faq.title" },
    { id: "questions", label: { fa: "پرسش‌ها", en: "Questions" } },
  ],
  contact: [
    { id: "title", label: { fa: "عنوان", en: "Title" }, field: "contact.title" },
    { id: "info", label: { fa: "اطلاعات تماس", en: "Contact info" } },
  ],
  footer: [
    { id: "brand", label: { fa: "برند", en: "Brand" } },
    { id: "links", label: { fa: "لینک‌ها", en: "Links" } },
  ],
};

export function fieldToSectionType(
  path: EditorFieldPath,
): WebsiteSectionType | undefined {
  if (path.startsWith("hero.")) return "hero";
  if (path.startsWith("about.")) return "about";
  if (path.startsWith("products.")) return "products";
  if (path.startsWith("services.")) return "services";
  if (path.startsWith("gallery.")) return "gallery";
  if (path.startsWith("faq.")) return "faq";
  if (path.startsWith("contact.")) return "contact";
  if (path.startsWith("testimonials.")) return "testimonials";
  if (path.startsWith("promo.")) return "cta";
  return undefined;
}

export type SectionSpacing = "compact" | "comfortable" | "spacious";
export type SectionWidth = "narrow" | "medium" | "full";
export type ProductSource = "all" | "manual" | "category";

export function readSectionSetting<T>(
  settings: Record<string, unknown> | undefined,
  key: string,
  fallback: T,
): T {
  const value = settings?.[key];
  return (value as T) ?? fallback;
}

export function spacingClass(spacing: SectionSpacing) {
  if (spacing === "compact") return "editor-sec-spacing-compact";
  if (spacing === "spacious") return "editor-sec-spacing-spacious";
  return "editor-sec-spacing-comfortable";
}

export function widthClass(width: SectionWidth) {
  if (width === "narrow") return "editor-sec-width-narrow";
  if (width === "medium") return "editor-sec-width-medium";
  return "editor-sec-width-full";
}
