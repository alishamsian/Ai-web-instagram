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
