/**
 * Map natural-language prompts to deterministic intents when possible.
 * No LLM call for matched intents.
 */

import type { MagicDesignDirection } from "@/lib/editor/ai";
import type { AiCoDesignerRequest } from "@/lib/editor/ai";

export type PromptRouteResult =
  | { kind: "deterministic"; request: AiCoDesignerRequest }
  | { kind: "llm"; reason: string }
  | { kind: "clarify"; messageFa: string; messageEn: string };

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

function detectDirection(text: string): MagicDesignDirection | undefined {
  if (includesAny(text, ["لوکس", "luxur", "premium", "elegant"])) {
    return "luxurious";
  }
  if (includesAny(text, ["مینیمال", "minimal"])) return "minimal";
  if (includesAny(text, ["مدرن", "modern"])) return "modern";
  if (includesAny(text, ["ادیتوریال", "editorial"])) return "editorial";
  if (includesAny(text, ["جسور", "bold"])) return "bold";
  if (includesAny(text, ["نرم", "soft", "آرام", "calm"])) return "soft";
  if (includesAny(text, ["ارگانیک", "organic", "طبیعی", "natural"])) {
    return "organic";
  }
  return undefined;
}

/**
 * Route a free-text prompt to deterministic co-designer intents when safe.
 */
export function routePromptToIntent(params: {
  prompt: string;
  locale: "fa" | "en";
  hasSelection: boolean;
}): PromptRouteResult {
  const raw = params.prompt.trim();
  if (!raw) {
    return {
      kind: "clarify",
      messageFa: "لطفاً بگویید چه تغییری می‌خواهید.",
      messageEn: "Please describe the change you want.",
    };
  }

  const text = raw.toLowerCase();
  const direction = detectDirection(text);

  // Restyle / design presets — never need LLM
  if (
    direction &&
    includesAny(text, [
      "کن",
      "بکن",
      "make",
      "restyle",
      "theme",
      "طراحی",
      "استایل",
      "ظاهر",
      "look",
      "feel",
      "صفحه",
      "page",
      "سایت",
      "site",
    ])
  ) {
    return {
      kind: "deterministic",
      request: { intent: "restyle", direction, locale: params.locale },
    };
  }

  if (
    includesAny(text, [
      "کوتاه",
      "shorten",
      "کوتاه‌تر",
      "کوتاهتر",
      "shorter",
      "مختصر",
    ]) &&
    includesAny(text, ["هیرو", "hero", "عنوان", "headline", "تیتر"])
  ) {
    return {
      kind: "deterministic",
      request: { intent: "shorten_hero", locale: params.locale },
    };
  }

  if (
    includesAny(text, ["کوتاه", "shorten", "کوتاه‌تر", "shorter", "مختصر"]) &&
    params.hasSelection
  ) {
    // Selection-scoped shorten → hero shorten if selected is hero; else LLM
    return {
      kind: "deterministic",
      request: { intent: "shorten_hero", locale: params.locale },
    };
  }

  if (
    includesAny(text, ["cta", "دکمه", "button", "فراخوان"]) &&
    includesAny(text, ["بهتر", "improve", "قوی", "حرفه‌ای", "professional"])
  ) {
    return {
      kind: "deterministic",
      request: { intent: "improve_cta", locale: params.locale },
    };
  }

  if (
    includesAny(text, ["ترجم", "translate", "english", "انگلیسی"]) &&
    includesAny(text, ["هیرو", "hero", "cta"])
  ) {
    return {
      kind: "deterministic",
      request: { intent: "translate_hero", locale: "en" },
    };
  }

  if (
    includesAny(text, ["موبایل", "mobile"]) &&
    includesAny(text, ["جمع", "compact", "کوتاه", "tighten", "فشرده"])
  ) {
    return {
      kind: "deterministic",
      request: { intent: "tighten_mobile_copy", locale: params.locale },
    };
  }

  if (
    includesAny(text, ["مشکی", "سیاه", "black", "#000"]) &&
    includesAny(text, ["دکمه", "button", "cta", "رنگ", "color", "primary"])
  ) {
    return {
      kind: "deterministic",
      request: {
        intent: "set_primary_black",
        locale: params.locale,
      },
    };
  }

  if (
    includesAny(text, ["مخفی", "hide", "پنهان"]) &&
    params.hasSelection
  ) {
    return {
      kind: "deterministic",
      request: {
        intent: "hide_selected",
        locale: params.locale,
      },
    };
  }

  if (
    includesAny(text, ["نشون بده", "نمایش", "show", "unhide"]) &&
    params.hasSelection
  ) {
    return {
      kind: "deterministic",
      request: {
        intent: "show_selected",
        locale: params.locale,
      },
    };
  }

  // Ambiguous "better" without selection
  if (
    includesAny(text, ["بهتر", "better", "این رو", "this"]) &&
    !params.hasSelection &&
    raw.length < 24
  ) {
    return {
      kind: "clarify",
      messageFa:
        "کدام بخش را منظورتان است؟ یک سکشن را انتخاب کنید یا دقیق‌تر بنویسید.",
      messageEn:
        "Which part? Select a section or describe the change more clearly.",
    };
  }

  return { kind: "llm", reason: "no_deterministic_match" };
}
