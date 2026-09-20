/**
 * Section / block variants — metadata-driven, persisted as data-section-variant /
 * data-component-variant. Does not duplicate WebsiteRenderer implementations.
 */

import type { VisualBlockVariant } from "@/lib/visual-editor/registry/types";

export const HERO_VARIANTS: VisualBlockVariant[] = [
  {
    id: "minimal",
    label: { fa: "مینیمال", en: "Minimal" },
    default: true,
  },
  { id: "split", label: { fa: "تقسیم‌شده", en: "Split" } },
  { id: "centered", label: { fa: "مرکزی", en: "Centered" } },
  {
    id: "overlay",
    label: { fa: "پس‌زمینه تصویری", en: "Image Background" },
  },
  { id: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
];

export const CTA_VARIANTS: VisualBlockVariant[] = [
  { id: "simple", label: { fa: "ساده", en: "Simple" }, default: true },
  { id: "split", label: { fa: "تقسیم‌شده", en: "Split" } },
  { id: "full-width", label: { fa: "تمام‌عرض", en: "Full Width" } },
];

export const TESTIMONIAL_VARIANTS: VisualBlockVariant[] = [
  { id: "quote", label: { fa: "نقل‌قول", en: "Quote" }, default: true },
  { id: "cards", label: { fa: "کارت‌ها", en: "Cards" } },
  { id: "carousel", label: { fa: "کاروسل", en: "Carousel" } },
];

export const ABOUT_VARIANTS: VisualBlockVariant[] = [
  { id: "story", label: { fa: "داستان", en: "Story" }, default: true },
  { id: "split", label: { fa: "تقسیم‌شده", en: "Split" } },
];

export const GALLERY_VARIANTS: VisualBlockVariant[] = [
  { id: "grid", label: { fa: "گرید", en: "Grid" }, default: true },
  { id: "masonry", label: { fa: "ماسونری", en: "Masonry" } },
];

export function defaultVariantId(
  variants: VisualBlockVariant[] | undefined,
): string | undefined {
  if (!variants?.length) return undefined;
  return variants.find((v) => v.default)?.id ?? variants[0].id;
}

export function resolveVariantId(
  variants: VisualBlockVariant[] | undefined,
  requested?: string,
): string | undefined {
  if (!variants?.length) return undefined;
  if (requested && variants.some((v) => v.id === requested)) return requested;
  return defaultVariantId(variants);
}
