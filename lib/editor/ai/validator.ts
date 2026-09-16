/**
 * Validate EditorAction[] against WebsiteConfig without mutating permanently.
 * Uses applyEditorAction dry-run on a working copy.
 */

import type { WebsiteConfig } from "@/types/website";
import {
  applyEditorAction,
  type EditorAction,
} from "@/lib/editor/actions";
import { isProductProtectedAction } from "@/lib/editor/ai";
import { cloneWebsiteConfig } from "@/lib/editor/types";

export type ActionValidationResult =
  | {
      ok: true;
      actions: EditorAction[];
      proposedConfig: WebsiteConfig;
      summaries: string[];
    }
  | {
      ok: false;
      reason: string;
      failedAction?: EditorAction;
    };

export function validateEditorActions(
  config: WebsiteConfig,
  actions: EditorAction[],
): ActionValidationResult {
  if (!actions.length) {
    return { ok: false, reason: "no_actions" };
  }
  if (actions.length > 12) {
    return { ok: false, reason: "too_many_actions" };
  }

  // Rough payload bound — reject absurd blobs
  try {
    if (JSON.stringify(actions).length > 48_000) {
      return { ok: false, reason: "actions_payload_too_large" };
    }
  } catch {
    return { ok: false, reason: "actions_not_serializable" };
  }

  let working = cloneWebsiteConfig(config);
  const accepted: EditorAction[] = [];
  const summaries: string[] = [];

  for (const action of actions) {
    if (isProductProtectedAction(action)) {
      return {
        ok: false,
        reason: "product_protected",
        failedAction: action,
      };
    }
    const applied = applyEditorAction(working, action);
    if (!applied.ok) {
      return {
        ok: false,
        reason: applied.reason,
        failedAction: action,
      };
    }
    working = applied.result.config;
    accepted.push(action);
    summaries.push(applied.result.label);
  }

  return {
    ok: true,
    actions: accepted,
    proposedConfig: working,
    summaries,
  };
}

/** Human-readable proposal lines for FA/EN UI. */
export function summarizeActionsForUi(
  actions: EditorAction[],
  locale: "fa" | "en",
): string[] {
  const isFa = locale === "fa";
  return actions.map((action) => {
    switch (action.type) {
      case "setContentPath":
        return isFa
          ? `محتوا: ${action.path.replace(/^content\./, "")}`
          : `Content: ${action.path.replace(/^content\./, "")}`;
      case "setThemePreset":
        return isFa
          ? `پیش‌تنظیم طراحی → ${action.presetId}`
          : `Theme preset → ${action.presetId}`;
      case "setBrandColor":
        return isFa
          ? `رنگ ${action.key} → ${action.value}`
          : `Brand ${action.key} → ${action.value}`;
      case "setSectionVariant":
        return isFa
          ? `واریانت سکشن → ${action.variantId}`
          : `Section variant → ${action.variantId}`;
      case "hideSection":
        return isFa ? "مخفی کردن سکشن" : "Hide section";
      case "showSection":
        return isFa ? "نمایش سکشن" : "Show section";
      case "moveSection":
        return isFa
          ? `جابه‌جایی سکشن (${action.direction})`
          : `Move section (${action.direction})`;
      case "reorderSections":
        return isFa
          ? `ترتیب سکشن‌ها ${action.fromIndex} → ${action.toIndex}`
          : `Reorder sections ${action.fromIndex} → ${action.toIndex}`;
      case "patchSectionSettings":
        return isFa ? "تنظیمات سکشن" : "Section settings";
      case "setSeoField":
        return isFa ? `سئو: ${action.field}` : `SEO: ${action.field}`;
      case "addSection":
        return isFa
          ? `افزودن ${action.sectionType}`
          : `Add ${action.sectionType}`;
      case "deleteSection":
        return isFa ? "حذف سکشن" : "Delete section";
      case "duplicateSection":
        return isFa ? "تکثیر سکشن" : "Duplicate section";
      default:
        return isFa ? "تغییر ساختاری" : "Structural change";
    }
  });
}
