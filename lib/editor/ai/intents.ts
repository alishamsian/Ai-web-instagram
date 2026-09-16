/**
 * Map natural-language prompts to deterministic intents when possible.
 * Selection-aware: never assume Hero for ambiguous shorten/improve.
 */

import type { MagicDesignDirection, AiCoDesignerRequest } from "@/lib/editor/ai";

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

function mentionsHero(text: string): boolean {
  return includesAny(text, ["هیرو", "hero", "عنوان هیرو", "hero headline"]);
}

function isShortenPrompt(text: string): boolean {
  return includesAny(text, [
    "کوتاه",
    "shorten",
    "کوتاه‌تر",
    "کوتاهتر",
    "shorter",
    "مختصر",
  ]);
}

/**
 * Route a free-text prompt to deterministic co-designer intents when safe.
 *
 * Precedence:
 * 1. Explicit section reference in prompt
 * 2. Selected section context
 * 3. Generic (site-wide) intent
 * 4. Deterministic only if unambiguous
 * 5. Otherwise LLM / clarification
 */
export function routePromptToIntent(params: {
  prompt: string;
  locale: "fa" | "en";
  hasSelection: boolean;
  /** Registry section type of the current selection, if any */
  selectedSectionType?: string | null;
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
  const selectedType = params.selectedSectionType ?? null;
  const selectedIsHero = selectedType === "hero";

  // Restyle / design presets — site-wide, never need LLM
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

  // --- Shorten ---
  if (isShortenPrompt(text)) {
    // Explicit hero reference wins
    if (mentionsHero(text) || includesAny(text, ["عنوان", "headline", "تیتر"])) {
      // "تیتر" alone with non-hero selection → still prefer selected if not hero mention
      if (mentionsHero(text) || !selectedType || selectedIsHero) {
        return {
          kind: "deterministic",
          request: { intent: "shorten_hero", locale: params.locale },
        };
      }
    }

    if (selectedIsHero) {
      return {
        kind: "deterministic",
        request: { intent: "shorten_hero", locale: params.locale },
      };
    }

    if (selectedType && !selectedIsHero) {
      // Do NOT silently run hero shorten on services/gallery/etc.
      return {
        kind: "llm",
        reason: "shorten_non_hero_selection",
      };
    }

    // No selection + generic shorten → clarify
    return {
      kind: "clarify",
      messageFa:
        "کدام بخش را کوتاه کنم؟ هیرو را انتخاب کنید یا دقیق‌تر بنویسید.",
      messageEn:
        "Which part should I shorten? Select the hero or be more specific.",
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

  if (includesAny(text, ["مخفی", "hide", "پنهان"]) && params.hasSelection) {
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

  // Ambiguous improve without clear target
  if (
    includesAny(text, ["بهتر", "better", "improve", "این رو", "this"]) &&
    raw.length < 28
  ) {
    if (!params.hasSelection) {
      return {
        kind: "clarify",
        messageFa:
          "کدام بخش را منظورتان است؟ یک سکشن را انتخاب کنید یا دقیق‌تر بنویسید.",
        messageEn:
          "Which part? Select a section or describe the change more clearly.",
      };
    }
    // Selection present but ambiguous — LLM with section context
    return { kind: "llm", reason: "ambiguous_improve_with_selection" };
  }

  return { kind: "llm", reason: "no_deterministic_match" };
}
