/**
 * Constrained EditorAction model — AI and tools must produce these, not raw CSS/HTML.
 */

import type {
  TemplateType,
  WebsiteConfig,
  WebsiteSectionType,
} from "@/types/website";
import type { ElementFieldSchema } from "@/lib/store/registry/element-schema";
import type { DesignPresetId } from "@/components/editor/editor-presets";
import { DESIGN_PRESETS } from "@/components/editor/editor-presets";
import {
  commandAddSection,
  commandApplyTemplate,
  commandApplyThemePreset,
  commandDeleteSection,
  commandDuplicateSection,
  commandMoveSection,
  commandReorderSections,
  commandSetBrandColor,
  commandSetContentPath,
  commandSetSchemaValue,
  commandSetSeoField,
  commandSetSectionVariant,
  commandPatchSectionSettings,
  commandToggleSection,
} from "@/lib/editor/commands";
import type { EditorCommandResult } from "@/lib/editor/types";
import { isAllowedSchemaPath } from "@/lib/store/registry/element-schema";
import { hasSection } from "@/lib/store/registry/catalog";

export type EditorAction =
  | { type: "setSchemaValue"; sectionId: string; field: ElementFieldSchema; value: unknown }
  | { type: "setContentPath"; path: string; value: string }
  | { type: "setThemePreset"; presetId: DesignPresetId }
  | { type: "setBrandColor"; key: keyof WebsiteConfig["brand"]["colors"]; value: string }
  | { type: "setSeoField"; field: "title" | "description"; value: string }
  | { type: "setSectionVariant"; sectionId: string; variantId: string }
  | {
      type: "patchSectionSettings";
      sectionId: string;
      patch: Record<string, unknown>;
    }
  | { type: "moveSection"; sectionId: string; direction: "up" | "down" }
  | { type: "reorderSections"; fromIndex: number; toIndex: number }
  | { type: "duplicateSection"; sectionId: string }
  | { type: "hideSection"; sectionId: string }
  | { type: "showSection"; sectionId: string }
  | { type: "deleteSection"; sectionId: string }
  | { type: "addSection"; sectionType: WebsiteSectionType }
  | { type: "applyTemplate"; templateId: TemplateType };

const PROTECTED_PATHS = [
  "content.products.items",
  "settings.published",
  "media",
];

const PRESET_IDS = new Set(DESIGN_PRESETS.map((p) => p.id));

/** Settings keys AI / tools may patch — presentation only. */
const ALLOWED_SETTINGS_KEYS = new Set([
  "spacing",
  "columns",
  "alignment",
  "layout",
  "density",
  "cardStyle",
  "displayMode",
  "maxItems",
  "showTitle",
  "overlay",
  "gap",
]);

export const FABRICATED_CLAIM_PATTERN =
  /#\s*1|award[-\s]?winning|award|10,?000|certified|5[-\s]?star|guaranteed|best\s+in\s+the\s+world|تضمینی|برنده‌ی?\s*جایزه|۱۰٬?۰۰۰|پنج\s*ستاره/i;

const MAX_SEO_TITLE = 120;
const MAX_SEO_DESC = 320;
const MAX_CONTENT_VALUE = 4000;

export type ApplyEditorActionResult =
  | { ok: true; result: EditorCommandResult }
  | { ok: false; reason: string };

function isPlainScalar(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

export function applyEditorAction(
  config: WebsiteConfig,
  action: EditorAction,
): ApplyEditorActionResult {
  switch (action.type) {
    case "setSchemaValue": {
      if (!config.sections.some((s) => s.id === action.sectionId)) {
        return { ok: false, reason: "Section not found" };
      }
      if (action.field.path && !isAllowedSchemaPath(action.field.path)) {
        return { ok: false, reason: "Schema path not allowed" };
      }
      if (
        action.field.path &&
        PROTECTED_PATHS.some((p) => action.field.path!.startsWith(p))
      ) {
        return { ok: false, reason: "Protected path" };
      }
      if (
        typeof action.value === "string" &&
        (action.value.length > MAX_CONTENT_VALUE ||
          FABRICATED_CLAIM_PATTERN.test(action.value))
      ) {
        return { ok: false, reason: "Value not allowed" };
      }
      const result = commandSetSchemaValue({
        config,
        sectionId: action.sectionId,
        field: action.field,
        value: action.value,
      });
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Schema update failed" };
    }
    case "setContentPath": {
      if (PROTECTED_PATHS.some((p) => action.path.startsWith(p))) {
        return { ok: false, reason: "Protected path" };
      }
      if (typeof action.value !== "string") {
        return { ok: false, reason: "Value must be string" };
      }
      if (action.value.length > MAX_CONTENT_VALUE) {
        return { ok: false, reason: "Value too long" };
      }
      if (FABRICATED_CLAIM_PATTERN.test(action.value)) {
        return { ok: false, reason: "Fabricated claim not allowed" };
      }
      const result = commandSetContentPath(config, action.path, action.value);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Content path not allowed" };
    }
    case "setThemePreset": {
      if (!PRESET_IDS.has(action.presetId)) {
        return { ok: false, reason: "Unknown preset" };
      }
      return {
        ok: true,
        result: commandApplyThemePreset(config, action.presetId),
      };
    }
    case "setBrandColor": {
      if (!/^#[0-9A-Fa-f]{6}$/.test(action.value)) {
        return { ok: false, reason: "Invalid color" };
      }
      return {
        ok: true,
        result: commandSetBrandColor(config, action.key, action.value),
      };
    }
    case "setSeoField": {
      if (FABRICATED_CLAIM_PATTERN.test(action.value)) {
        return { ok: false, reason: "SEO claim not allowed" };
      }
      const max = action.field === "title" ? MAX_SEO_TITLE : MAX_SEO_DESC;
      if (action.value.length > max) {
        return { ok: false, reason: "SEO value too long" };
      }
      if (/<[^>]+>/.test(action.value)) {
        return { ok: false, reason: "HTML not allowed" };
      }
      return {
        ok: true,
        result: commandSetSeoField(config, action.field, action.value),
      };
    }
    case "setSectionVariant": {
      const result = commandSetSectionVariant(
        config,
        action.sectionId,
        action.variantId,
      );
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Variant not supported" };
    }
    case "patchSectionSettings": {
      if (!config.sections.some((s) => s.id === action.sectionId)) {
        return { ok: false, reason: "Section not found" };
      }
      const keys = Object.keys(action.patch);
      if (!keys.length || keys.length > 12) {
        return { ok: false, reason: "Settings patch size invalid" };
      }
      for (const key of keys) {
        if (!ALLOWED_SETTINGS_KEYS.has(key)) {
          return { ok: false, reason: `Settings key not allowed: ${key}` };
        }
        const value = action.patch[key];
        if (!isPlainScalar(value)) {
          return { ok: false, reason: "Nested settings not allowed" };
        }
        if (
          typeof value === "string" &&
          (value.length > 200 || FABRICATED_CLAIM_PATTERN.test(value))
        ) {
          return { ok: false, reason: "Settings value not allowed" };
        }
      }
      const result = commandPatchSectionSettings(
        config,
        action.sectionId,
        action.patch,
      );
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Settings patch failed" };
    }
    case "moveSection": {
      const result = commandMoveSection(
        config,
        action.sectionId,
        action.direction,
      );
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Cannot move section" };
    }
    case "reorderSections": {
      if (
        !Number.isInteger(action.fromIndex) ||
        !Number.isInteger(action.toIndex) ||
        action.fromIndex < 0 ||
        action.toIndex < 0 ||
        action.fromIndex >= config.sections.length ||
        action.toIndex >= config.sections.length
      ) {
        return { ok: false, reason: "Invalid reorder indexes" };
      }
      const result = commandReorderSections(
        config,
        action.fromIndex,
        action.toIndex,
      );
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Cannot reorder" };
    }
    case "duplicateSection": {
      const result = commandDuplicateSection(config, action.sectionId);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Cannot duplicate" };
    }
    case "hideSection":
    case "showSection": {
      const section = config.sections.find((s) => s.id === action.sectionId);
      if (!section) return { ok: false, reason: "Section not found" };
      const wantVisible = action.type === "showSection";
      if (section.visible === wantVisible) {
        return { ok: false, reason: "Already in desired visibility" };
      }
      const result = commandToggleSection(config, action.sectionId);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Cannot toggle" };
    }
    case "deleteSection": {
      const result = commandDeleteSection(config, action.sectionId);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Cannot delete section" };
    }
    case "addSection": {
      if (!hasSection(action.sectionType)) {
        return { ok: false, reason: "Unknown section type" };
      }
      const result = commandAddSection(config, action.sectionType);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Unknown or invalid section" };
    }
    case "applyTemplate": {
      // Template apply remains available for tools; AI schema still rejects it.
      return {
        ok: true,
        result: commandApplyTemplate(config, action.templateId),
      };
    }
    default:
      return { ok: false, reason: "Unknown action" };
  }
}
