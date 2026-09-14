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
  commandToggleSection,
} from "@/lib/editor/commands";
import type { EditorCommandResult } from "@/lib/editor/types";
import { isAllowedSchemaPath } from "@/lib/store/registry/element-schema";

export type EditorAction =
  | { type: "setSchemaValue"; sectionId: string; field: ElementFieldSchema; value: unknown }
  | { type: "setContentPath"; path: string; value: string }
  | { type: "setThemePreset"; presetId: DesignPresetId }
  | { type: "setBrandColor"; key: keyof WebsiteConfig["brand"]["colors"]; value: string }
  | { type: "setSeoField"; field: "title" | "description"; value: string }
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

export type ApplyEditorActionResult =
  | { ok: true; result: EditorCommandResult }
  | { ok: false; reason: string };

export function applyEditorAction(
  config: WebsiteConfig,
  action: EditorAction,
): ApplyEditorActionResult {
  switch (action.type) {
    case "setSchemaValue": {
      if (action.field.path && !isAllowedSchemaPath(action.field.path)) {
        return { ok: false, reason: "Schema path not allowed" };
      }
      if (
        action.field.path &&
        PROTECTED_PATHS.some((p) => action.field.path!.startsWith(p))
      ) {
        return { ok: false, reason: "Protected path" };
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
      const result = commandSetContentPath(config, action.path, action.value);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Content path not allowed" };
    }
    case "setThemePreset": {
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
      if (/#\s*1|award|10,?000|certified/i.test(action.value)) {
        return { ok: false, reason: "SEO claim not allowed" };
      }
      return {
        ok: true,
        result: commandSetSeoField(config, action.field, action.value),
      };
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
      const result = commandAddSection(config, action.sectionType);
      return result
        ? { ok: true, result }
        : { ok: false, reason: "Unknown or invalid section" };
    }
    case "applyTemplate": {
      return {
        ok: true,
        result: commandApplyTemplate(config, action.templateId),
      };
    }
    default:
      return { ok: false, reason: "Unknown action" };
  }
}
