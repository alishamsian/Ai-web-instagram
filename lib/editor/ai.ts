/**
 * AI Co-Designer foundation — produces constrained EditorActions only.
 * Never emits HTML/CSS/JS. Never invents product facts.
 */

import type { WebsiteConfig } from "@/types/website";
import type { EditorAction } from "@/lib/editor/actions";
import type { DesignPresetId } from "@/components/editor/editor-presets";

export type MagicDesignDirection =
  | "luxurious"
  | "editorial"
  | "minimal"
  | "modern"
  | "bold"
  | "soft"
  | "organic";

const DIRECTION_TO_PRESET: Record<MagicDesignDirection, DesignPresetId> = {
  luxurious: "luxury",
  editorial: "editorial",
  minimal: "minimal",
  modern: "modern",
  bold: "bold",
  soft: "natural",
  organic: "natural",
};

export type AiCoDesignerRequest = {
  intent:
    | "restyle"
    | "shorten_hero"
    | "improve_cta"
    | "translate_hero"
    | "tighten_mobile_copy";
  direction?: MagicDesignDirection;
  locale?: "fa" | "en";
};

/**
 * Deterministic structured suggestions — no network.
 * Real LLM providers can wrap this interface later.
 */
export function proposeEditorActions(
  config: WebsiteConfig,
  request: AiCoDesignerRequest,
): EditorAction[] {
  const actions: EditorAction[] = [];

  switch (request.intent) {
    case "restyle": {
      const preset =
        DIRECTION_TO_PRESET[request.direction ?? "editorial"] ?? "editorial";
      actions.push({ type: "setThemePreset", presetId: preset });
      break;
    }
    case "shorten_hero": {
      const headline = config.content.hero.headline.trim();
      if (headline.length > 42) {
        actions.push({
          type: "setContentPath",
          path: "content.hero.headline",
          value: `${headline.slice(0, 40).trim()}…`,
        });
      }
      const sub = config.content.hero.subheadline.trim();
      if (sub.length > 110) {
        actions.push({
          type: "setContentPath",
          path: "content.hero.subheadline",
          value: `${sub.slice(0, 108).trim()}…`,
        });
      }
      break;
    }
    case "improve_cta": {
      const isFa = config.settings.language === "fa";
      actions.push({
        type: "setContentPath",
        path: "content.hero.cta",
        value: isFa ? "مشاهده مجموعه" : "Explore the collection",
      });
      break;
    }
    case "translate_hero": {
      // Only switch CTA/label style — do not invent brand claims
      const toEn = request.locale === "en" || config.settings.language === "fa";
      if (toEn) {
        actions.push({
          type: "setContentPath",
          path: "content.hero.cta",
          value: "Shop now",
        });
      }
      break;
    }
    case "tighten_mobile_copy": {
      const sub = config.content.hero.subheadline.trim();
      if (sub.length > 80) {
        actions.push({
          type: "setContentPath",
          path: "content.hero.subheadline",
          value: `${sub.slice(0, 78).trim()}…`,
        });
      }
      break;
    }
    default:
      break;
  }

  return actions;
}

/** Guard: AI must never emit product identity mutations. */
export function isProductProtectedAction(action: EditorAction): boolean {
  if (action.type === "setContentPath") {
    return action.path.startsWith("content.products.items");
  }
  if (action.type === "setSchemaValue") {
    const path = action.field.path ?? "";
    return path.includes("products.items") || path.includes("price");
  }
  return false;
}
