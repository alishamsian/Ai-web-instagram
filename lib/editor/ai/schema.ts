/**
 * Parse & validate LLM JSON into EditorAction[].
 * Rejects unknown shapes; never invents HTML/CSS.
 */

import type { EditorAction } from "@/lib/editor/actions";
import type { DesignPresetId } from "@/components/editor/editor-presets";
import { DESIGN_PRESETS } from "@/components/editor/editor-presets";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import { hasSection } from "@/lib/store/registry/catalog";
import { isVariantSupported } from "@/lib/store/registry";

const PRESET_IDS = new Set(DESIGN_PRESETS.map((p) => p.id));

const BRAND_COLOR_KEYS = new Set([
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "muted",
]);

export type ParsedAiActionsResult =
  | { ok: true; actions: EditorAction[]; summary: string }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOneAction(
  raw: unknown,
  config: WebsiteConfig,
): EditorAction | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "setContentPath": {
      if (typeof raw.path !== "string" || typeof raw.value !== "string") {
        return null;
      }
      return { type: "setContentPath", path: raw.path, value: raw.value };
    }
    case "setThemePreset": {
      if (typeof raw.presetId !== "string" || !PRESET_IDS.has(raw.presetId as DesignPresetId)) {
        return null;
      }
      return {
        type: "setThemePreset",
        presetId: raw.presetId as DesignPresetId,
      };
    }
    case "setBrandColor": {
      if (
        typeof raw.key !== "string" ||
        !BRAND_COLOR_KEYS.has(raw.key) ||
        typeof raw.value !== "string"
      ) {
        return null;
      }
      return {
        type: "setBrandColor",
        key: raw.key as keyof WebsiteConfig["brand"]["colors"],
        value: raw.value,
      };
    }
    case "setSeoField": {
      if (
        (raw.field !== "title" && raw.field !== "description") ||
        typeof raw.value !== "string"
      ) {
        return null;
      }
      return { type: "setSeoField", field: raw.field, value: raw.value };
    }
    case "setSectionVariant": {
      if (
        typeof raw.sectionId !== "string" ||
        typeof raw.variantId !== "string"
      ) {
        return null;
      }
      const section = config.sections.find((s) => s.id === raw.sectionId);
      if (!section) return null;
      if (!isVariantSupported(section.type, raw.variantId)) return null;
      return {
        type: "setSectionVariant",
        sectionId: raw.sectionId,
        variantId: raw.variantId,
      };
    }
    case "patchSectionSettings": {
      if (typeof raw.sectionId !== "string" || !isRecord(raw.patch)) return null;
      const section = config.sections.find((s) => s.id === raw.sectionId);
      if (!section) return null;
      return {
        type: "patchSectionSettings",
        sectionId: raw.sectionId,
        patch: { ...raw.patch },
      };
    }
    case "moveSection": {
      if (
        typeof raw.sectionId !== "string" ||
        (raw.direction !== "up" && raw.direction !== "down")
      ) {
        return null;
      }
      return {
        type: "moveSection",
        sectionId: raw.sectionId,
        direction: raw.direction,
      };
    }
    case "reorderSections": {
      if (
        typeof raw.fromIndex !== "number" ||
        typeof raw.toIndex !== "number"
      ) {
        return null;
      }
      return {
        type: "reorderSections",
        fromIndex: raw.fromIndex,
        toIndex: raw.toIndex,
      };
    }
    case "hideSection":
    case "showSection":
    case "duplicateSection":
    case "deleteSection": {
      if (typeof raw.sectionId !== "string") return null;
      return { type: raw.type, sectionId: raw.sectionId };
    }
    case "addSection": {
      if (typeof raw.sectionType !== "string") return null;
      if (!hasSection(raw.sectionType)) return null;
      return {
        type: "addSection",
        sectionType: raw.sectionType as WebsiteSectionType,
      };
    }
    // setSchemaValue from LLM is too easy to abuse — reject
    case "setSchemaValue":
    case "applyTemplate":
      return null;
    default:
      return null;
  }
}

export function parseAiActionsPayload(
  payload: unknown,
  config: WebsiteConfig,
): ParsedAiActionsResult {
  if (!isRecord(payload)) {
    return { ok: false, reason: "invalid_json" };
  }

  const summary =
    typeof payload.summary === "string" && payload.summary.trim()
      ? payload.summary.trim().slice(0, 240)
      : "AI proposal";

  const list = Array.isArray(payload.actions) ? payload.actions : null;
  if (!list || list.length === 0) {
    return { ok: false, reason: "empty_actions" };
  }
  if (list.length > 12) {
    return { ok: false, reason: "too_many_actions" };
  }

  const actions: EditorAction[] = [];
  for (const item of list) {
    const action = parseOneAction(item, config);
    if (!action) {
      return { ok: false, reason: "invalid_action" };
    }
    actions.push(action);
  }

  return { ok: true, actions, summary };
}
