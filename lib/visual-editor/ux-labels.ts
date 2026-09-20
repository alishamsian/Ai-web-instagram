/**
 * Product-facing labels for Visual Builder UX (breadcrumb, hover, navigator).
 * Prefer registry labels over raw data-component-type ids.
 */

import { getVisualBlock } from "@/lib/visual-editor/registry";
import { normalizeBlockId } from "@/lib/visual-editor/dnd/nesting";

export type LabelLocale = "fa" | "en";

const FALLBACK: Record<string, { fa: string; en: string }> = {
  wrapper: { fa: "صفحه", en: "Page" },
  body: { fa: "صفحه", en: "Page" },
  section: { fa: "سکشن", en: "Section" },
  unknown: { fa: "عنصر", en: "Element" },
};

/** Friendly HTML tag labels (avoid raw H1 / DIV in Layers). */
const TAG_LABELS: Record<string, { fa: string; en: string }> = {
  h1: { fa: "عنوان ۱", en: "Heading 1" },
  h2: { fa: "عنوان ۲", en: "Heading 2" },
  h3: { fa: "عنوان ۳", en: "Heading 3" },
  h4: { fa: "عنوان ۴", en: "Heading 4" },
  h5: { fa: "عنوان ۵", en: "Heading 5" },
  h6: { fa: "عنوان ۶", en: "Heading 6" },
  p: { fa: "پاراگراف", en: "Paragraph" },
  span: { fa: "متن", en: "Text" },
  div: { fa: "باکس", en: "Box" },
  section: { fa: "سکشن", en: "Section" },
  article: { fa: "مقاله", en: "Article" },
  header: { fa: "هدر", en: "Header" },
  footer: { fa: "فوتر", en: "Footer" },
  nav: { fa: "ناوبری", en: "Nav" },
  main: { fa: "اصلی", en: "Main" },
  aside: { fa: "کناری", en: "Aside" },
  img: { fa: "تصویر", en: "Image" },
  picture: { fa: "تصویر", en: "Picture" },
  video: { fa: "ویدیو", en: "Video" },
  a: { fa: "لینک", en: "Link" },
  button: { fa: "دکمه", en: "Button" },
  ul: { fa: "فهرست", en: "List" },
  ol: { fa: "فهرست شماره‌دار", en: "Ordered list" },
  li: { fa: "آیتم", en: "List item" },
  form: { fa: "فرم", en: "Form" },
  input: { fa: "ورودی", en: "Input" },
  textarea: { fa: "متن بلند", en: "Textarea" },
  label: { fa: "برچسب", en: "Label" },
  figure: { fa: "فیگور", en: "Figure" },
  figcaption: { fa: "زیرنویس", en: "Caption" },
};

/** Human-readable label for a block / section type id. */
export function formatBlockTypeLabel(
  rawType: string | undefined | null,
  locale: LabelLocale = "en",
): string {
  if (!rawType) return locale === "fa" ? FALLBACK.unknown.fa : FALLBACK.unknown.en;
  const normalized = normalizeBlockId(rawType) || rawType;
  const def = getVisualBlock(normalized);
  if (def) return locale === "fa" ? def.label.fa : def.label.en;

  if (FALLBACK[normalized]) {
    return locale === "fa" ? FALLBACK[normalized].fa : FALLBACK[normalized].en;
  }

  // section-hero → Hero, content-heading → Heading
  const stripped = normalized
    .replace(/^(section|layout|content|media|form|nav)-/, "")
    .replace(/-/g, " ");
  if (!stripped) return normalized;
  return stripped.replace(/\b\w/g, (c) => c.toUpperCase());
}

export type ComponentLabelAttrs = Record<string, string | undefined>;

/**
 * Resolve display label from GrapesJS-like attributes.
 * Prefers data-label, then registry type, then tag.
 */
export function formatComponentLabel(
  attrs: ComponentLabelAttrs | undefined,
  options?: {
    locale?: LabelLocale;
    tagName?: string;
    /** Optional short text preview for leaves */
    textPreview?: string;
  },
): string {
  const locale = options?.locale ?? "en";
  if (attrs?.["data-label"]?.trim()) return attrs["data-label"].trim();

  const type =
    attrs?.["data-section-type"] ||
    attrs?.["data-component-type"] ||
    undefined;
  if (type) {
    const base = formatBlockTypeLabel(type, locale);
    const preview = options?.textPreview?.trim();
    if (preview && preview.length > 0 && preview.length <= 24) {
      return `${base}: ${preview}`;
    }
    return base;
  }

  const tag = (options?.tagName || "").toLowerCase();
  if (tag === "body" || tag === "wrapper") {
    return locale === "fa" ? FALLBACK.wrapper.fa : FALLBACK.wrapper.en;
  }
  if (tag && TAG_LABELS[tag]) {
    const base = locale === "fa" ? TAG_LABELS[tag].fa : TAG_LABELS[tag].en;
    const preview = options?.textPreview?.trim();
    if (preview && preview.length > 0 && preview.length <= 24) {
      return `${base}: ${preview}`;
    }
    return base;
  }
  if (tag) return tag.toUpperCase();
  return locale === "fa" ? FALLBACK.unknown.fa : FALLBACK.unknown.en;
}

/** Breadcrumb root always starts with Page. */
export function withPageBreadcrumbRoot(
  crumbs: Array<{ id: string; label: string }>,
  locale: LabelLocale = "en",
): Array<{ id: string; label: string }> {
  const pageLabel = locale === "fa" ? FALLBACK.wrapper.fa : FALLBACK.wrapper.en;
  if (crumbs.length === 0) return [{ id: "page", label: pageLabel }];
  if (crumbs[0]?.id === "page" || crumbs[0]?.label === pageLabel) return crumbs;
  return [{ id: "page", label: pageLabel }, ...crumbs];
}

export function dropPositionLabel(
  position: "before" | "after" | "inside",
  locale: LabelLocale = "en",
): string {
  if (locale === "fa") {
    if (position === "before") return "قبل";
    if (position === "after") return "بعد";
    return "داخل";
  }
  if (position === "before") return "Drop before";
  if (position === "after") return "Drop after";
  return "Drop inside";
}

export function saveStateLabel(
  state: "clean" | "dirty" | "saving" | "saved" | "error" | "conflict",
  locale: LabelLocale = "en",
): string {
  const map =
    locale === "fa"
      ? {
          clean: "ذخیره شده",
          dirty: "ذخیره‌نشده",
          saving: "در حال ذخیره…",
          saved: "ذخیره شد",
          error: "خطا در ذخیره",
          conflict: "تداخل نسخه",
        }
      : {
          clean: "Saved",
          dirty: "Unsaved changes",
          saving: "Saving…",
          saved: "Saved",
          error: "Save failed",
          conflict: "Version conflict",
        };
  return map[state];
}
