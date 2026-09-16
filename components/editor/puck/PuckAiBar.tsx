"use client";

/**
 * Phase 3 placeholder — AI command bar slot.
 * Does not call any LLM. Deterministic editing stays free.
 */

import type { Locale } from "@/lib/config/env";
import { Sparkles } from "lucide-react";

export function PuckAiBar({ locale }: { locale: Locale }) {
  const isFa = locale === "fa";
  return (
    <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        <Sparkles className="size-4 shrink-0 text-zinc-400" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {isFa
            ? "✨ چه تغییری می‌خواهی؟ (AI در فاز ۳ فعال می‌شود)"
            : "✨ What do you want to change? (AI activates in Phase 3)"}
        </span>
        <span className="shrink-0 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
          Phase 3
        </span>
      </div>
    </div>
  );
}
