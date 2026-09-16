"use client";

/**
 * Phase 3 — Real AI Co-Designer command bar for Puck.
 * Proposes validated EditorActions; Apply is a single history transaction.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { usePuck } from "@puckeditor/core";
import {
  Loader2,
  Sparkles,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import type { EditorAction } from "@/lib/editor/actions";
import type { ViewportBucket } from "@/lib/editor/responsive";
import { cn } from "@/lib/utils";

export type AiBarPhase =
  | "idle"
  | "thinking"
  | "proposing"
  | "ready"
  | "applying"
  | "success"
  | "error";

export type AiProposal = {
  summary: string;
  actions: EditorAction[];
  summaries: string[];
  mode: "deterministic" | "llm";
};

const EXAMPLES_FA = [
  "عنوان هیرو رو حرفه‌ای‌تر و کوتاه‌تر کن",
  "رنگ دکمه‌ها رو مشکی کن",
  "این صفحه رو مدرن‌تر و مینیمال‌تر کن",
  "این سکشن رو برای موبایل جمع‌وجورتر کن",
];

const EXAMPLES_EN = [
  "Make the hero headline shorter and more premium",
  "Make the CTA buttons black",
  "Make this page more modern and minimal",
  "Make this section more compact on mobile",
];

function viewportFromWidth(width: number | "100%"): ViewportBucket {
  if (width === "100%" || typeof width !== "number") return "desktop";
  if (width <= 480) return "mobile";
  if (width <= 900) return "tablet";
  return "desktop";
}

export function PuckAiBar({
  locale,
  websiteId,
  config,
  version,
  onApplyProposal,
}: {
  locale: Locale;
  websiteId: string;
  config: WebsiteConfig;
  version: number;
  /** Apply validated actions as ONE history transaction. Returns false on failure. */
  onApplyProposal: (proposal: AiProposal) => boolean | Promise<boolean>;
}) {
  const isFa = locale === "fa";
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { selectedItem, appState } = usePuck();

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<AiBarPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AiProposal | null>(null);

  const selectedSectionId =
    (selectedItem?.props?.sectionId as string | undefined) ||
    (selectedItem?.props?.id as string | undefined) ||
    null;

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusInput]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProposal(null);
    setError(null);
    setPhase("idle");
  }, []);

  const viewport = viewportFromWidth(appState.ui.viewports.current.width);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || phase === "thinking" || phase === "applying") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("thinking");
    setError(null);
    setProposal(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/ai/co-design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: text,
          selectedSectionId,
          viewport,
          locale,
          config,
          expectedVersion: version,
        }),
      });

      if (res.status === 409) {
        setPhase("error");
        setError(
          isFa
            ? "نسخه سایت تغییر کرده. صفحه را به‌روزرسانی کنید و دوباره تلاش کنید."
            : "The website changed while you were editing. Refresh and try again.",
        );
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        mode?: "deterministic" | "llm";
        summary?: string;
        actions?: EditorAction[];
        summaries?: string[];
        messageFa?: string;
        messageEn?: string;
        error?: string;
      };

      if (!res.ok || !body.ok || !body.actions?.length) {
        setPhase("error");
        setError(
          (isFa ? body.messageFa : body.messageEn) ||
            (isFa
              ? "AI نتوانست این تغییر را به‌صورت امن اعمال کند."
              : "AI could not safely apply this change."),
        );
        return;
      }

      setPhase("ready");
      setProposal({
        summary: body.summary ?? (isFa ? "پیشنهاد AI" : "AI proposal"),
        actions: body.actions,
        summaries: body.summaries ?? [],
        mode: body.mode ?? "llm",
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("idle");
        return;
      }
      setPhase("error");
      setError(
        isFa
          ? "خطای شبکه هنگام تماس با AI."
          : "Network error while contacting AI.",
      );
    }
  }, [
    prompt,
    phase,
    websiteId,
    selectedSectionId,
    viewport,
    locale,
    config,
    version,
    isFa,
  ]);

  const apply = useCallback(async () => {
    if (!proposal) return;
    setPhase("applying");
    try {
      const ok = await onApplyProposal(proposal);
      if (!ok) {
        setPhase("error");
        setError(
          isFa
            ? "اعمال تغییرات ناموفق بود."
            : "Failed to apply changes.",
        );
        return;
      }
      setPhase("success");
      setProposal(null);
      setPrompt("");
      window.setTimeout(() => setPhase("idle"), 1200);
    } catch {
      setPhase("error");
      setError(isFa ? "اعمال تغییرات ناموفق بود." : "Failed to apply changes.");
    }
  }, [proposal, onApplyProposal, isFa]);

  const examples = isFa ? EXAMPLES_FA : EXAMPLES_EN;
  const busy = phase === "thinking" || phase === "applying";

  return (
    <div
      className="shrink-0 border-t border-zinc-200 bg-white"
      dir={isFa ? "rtl" : "ltr"}
    >
      {proposal && phase === "ready" ? (
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900">
                {isFa ? "تغییرات پیشنهادی" : "Proposed changes"}
                <span className="ms-2 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                  {proposal.mode === "deterministic"
                    ? isFa
                      ? "قطعی · رایگان"
                      : "Deterministic · $0"
                    : "LLM"}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {proposal.summary}
              </p>
              <ul className="mt-2 space-y-1">
                {proposal.summaries.map((line, i) => (
                  <li
                    key={`${line}-${i}`}
                    className="flex gap-2 text-xs text-zinc-700"
                  >
                    <span className="text-zinc-400" aria-hidden>
                      •
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
              >
                <X className="size-3.5" />
                {isFa ? "لغو" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void apply()}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                <Check className="size-3.5" />
                {proposal.actions.length > 1
                  ? isFa
                    ? "اعمال همه"
                    : "Apply all"
                  : isFa
                    ? "اعمال"
                    : "Apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {(phase === "error" || error) && phase !== "ready" ? (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            className="underline"
            onClick={cancel}
          >
            {isFa ? "بستن" : "Dismiss"}
          </button>
        </div>
      ) : null}

      <div className="px-4 py-2.5">
        <label htmlFor={inputId} className="sr-only">
          {isFa ? "دستور AI" : "AI command"}
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900">
          <Sparkles
            className={cn(
              "size-4 shrink-0",
              phase === "success" ? "text-emerald-600" : "text-zinc-400",
            )}
            aria-hidden
          />
          <input
            ref={inputRef}
            id={inputId}
            value={prompt}
            disabled={busy}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
                return;
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={
              selectedSectionId
                ? isFa
                  ? "چه تغییری روی سکشن انتخاب‌شده؟ (⌘K)"
                  : "What should change on the selected section? (⌘K)"
                : isFa
                  ? "چه تغییری می‌خواهی؟ (⌘K)"
                  : "What do you want to change? (⌘K)"
            }
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-60"
            dir="auto"
            autoComplete="off"
          />
          {busy ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-zinc-500" />
          ) : null}
          {phase === "thinking" ? (
            <button
              type="button"
              onClick={cancel}
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200"
            >
              {isFa ? "لغو" : "Cancel"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!prompt.trim() || busy}
              onClick={() => void submit()}
              className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              {isFa ? "پیشنهاد" : "Propose"}
            </button>
          )}
        </div>
        {phase === "idle" && !proposal ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setPrompt(ex);
                  focusInput();
                }}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
              >
                {ex}
              </button>
            ))}
          </div>
        ) : null}
        {phase === "success" ? (
          <p className="mt-2 text-[11px] text-emerald-700">
            {isFa ? "اعمال شد. با ⌘Z می‌توانید برگردانید." : "Applied. Undo with ⌘Z."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
