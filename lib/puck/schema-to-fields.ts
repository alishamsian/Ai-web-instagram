/**
 * Map Element Schema → native Puck fields so every schema property
 * appears in the Fields panel (demo-style fine editing).
 */

import type { Fields } from "@puckeditor/core";
import type {
  ElementFieldSchema,
  ElementSchema,
} from "@/lib/store/registry/element-schema";
import { flattenElementFields } from "@/lib/store/registry/element-schema";

function labelOf(
  field: ElementFieldSchema,
  locale: "fa" | "en",
): string {
  return field.label?.[locale] ?? field.label?.en ?? field.key;
}

function selectOptions(
  field: ElementFieldSchema,
  locale: "fa" | "en",
): { label: string; value: string | number | boolean }[] {
  return (field.options ?? []).map((opt) => ({
    label: opt.label[locale] ?? opt.label.en,
    value: opt.value,
  }));
}

/** Relative key under `settings` object for Puck nested fields. */
export function settingsRelPath(path: string): string | null {
  if (!path.startsWith("settings.")) return null;
  return path.slice("settings.".length);
}

export function isContentOrBrandPath(path: string | undefined): boolean {
  if (!path) return false;
  return path.startsWith("content.") || path.startsWith("brand.");
}

export function isSettingsPath(path: string | undefined): boolean {
  return Boolean(path?.startsWith("settings."));
}

/**
 * Build Puck `settings` object fields from Element Schema settings.* paths.
 * Content/brand/media paths are handled by custom bound fields separately.
 */
export function schemaToSettingsObjectFields(
  schema: ElementSchema | undefined,
  locale: "fa" | "en",
): Fields {
  if (!schema) return {};
  const fields: Fields = {};
  for (const field of flattenElementFields(schema)) {
    if (field.hidden) continue;
    if (!field.path || !isSettingsPath(field.path)) continue;
    const rel = settingsRelPath(field.path);
    if (!rel || rel.includes(".")) {
      // Keep nested settings as flat keys with __ for depth (Puck object is 1 level)
      // Prefer leaf keys for one-level settings (alignment, gap, …)
      if (!rel) continue;
    }
    const key = rel.includes(".") ? rel.replace(/\./g, "__") : rel;
    fields[key] = elementFieldToPuckField(field, locale);
  }
  return fields;
}

export function schemaContentBoundFieldKeys(
  schema: ElementSchema | undefined,
): ElementFieldSchema[] {
  if (!schema) return [];
  return flattenElementFields(schema).filter(
    (f) =>
      !f.hidden &&
      f.path &&
      (isContentOrBrandPath(f.path) ||
        f.kind === "media" ||
        f.path === "visible" ||
        f.path === "variant"),
  );
}

export function elementFieldToPuckField(
  field: ElementFieldSchema,
  locale: "fa" | "en",
): Fields[string] {
  const label = labelOf(field, locale);
  switch (field.kind) {
    case "textarea":
      return { type: "textarea", label, contentEditable: true };
    case "richText":
      return {
        type: "richtext",
        label,
        contentEditable: true,
        initialHeight: 140,
      };
    case "boolean":
      return {
        type: "radio",
        label,
        options: [
          { label: locale === "fa" ? "بله" : "Yes", value: true },
          { label: locale === "fa" ? "خیر" : "No", value: false },
        ],
      };
    case "number":
      return {
        type: "number",
        label,
        min: field.min,
        max: field.max,
        step: field.step ?? 1,
      };
    case "select":
    case "alignment":
    case "spacing":
    case "radius":
    case "shadow":
    case "typography":
    case "dataSource":
    case "icon": {
      const options = selectOptions(field, locale);
      if (options.length > 0) {
        return { type: "select", label, options };
      }
      return { type: "text", label };
    }
    case "link":
      return { type: "text", label };
    case "color":
      return { type: "text", label };
    case "responsive":
      return { type: "object", label, objectFields: {
        mobile: { type: "number", label: locale === "fa" ? "موبایل" : "Mobile" },
        tablet: { type: "number", label: locale === "fa" ? "تبلت" : "Tablet" },
        desktop: { type: "number", label: locale === "fa" ? "دسکتاپ" : "Desktop" },
      } };
    case "media":
      // Prefer native external via advanced fields; text id as settings fallback
      return { type: "text", label };
    case "text":
    default:
      return { type: "text", label, contentEditable: true };
  }
}

export function groupLabel(
  group: string,
  locale: "fa" | "en",
): string {
  const map: Record<string, { fa: string; en: string }> = {
    content: { fa: "محتوا", en: "Content" },
    layout: { fa: "چیدمان", en: "Layout" },
    typography: { fa: "تایپوگرافی", en: "Typography" },
    media: { fa: "رسانه", en: "Media" },
    style: { fa: "استایل", en: "Style" },
    actions: { fa: "اقدامات", en: "Actions" },
    data: { fa: "داده", en: "Data" },
    visibility: { fa: "نمایش", en: "Visibility" },
    responsive: { fa: "ریسپانسیو", en: "Responsive" },
  };
  return map[group]?.[locale] ?? group;
}
