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
import { buildDraftHintsFromConfig } from "@/lib/editor/ai/draft";
import { cn } from "@/lib/utils";

export type AiBarPhase =
  | "idle"
  | "thinking"
  | "proposing"
  | "ready"
  | "applying"
  | "success"
  | "error"
  | "stale"
  | "cancelled";

export type AiProposal = {
  summary: string;
  actions: EditorAction[];
  summaries: string[];
  mode: "deterministic" | "llm";
  /** Server website.version at propose time */
  baseVersion: number;
  /** Client localRevision at propose time */
  localRevision: number;
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
  localRevision,
  onApplyProposal,
  layout = "bar",
}: {
  locale: Locale;
  websiteId: string;
  config: WebsiteConfig;
  version: number;
  localRevision: number;
  /**
   * Apply validated actions as ONE history transaction.
   * Returns `{ ok: true }` or `{ ok: false, reason }`.
   */
  onApplyProposal: (
    proposal: AiProposal,
  ) =>
    | boolean
    | { ok: boolean; reason?: "stale" | "rejected" | "error"; message?: string }
    | Promise<
        | boolean
        | {
            ok: boolean;
            reason?: "stale" | "rejected" | "error";
            message?: string;
          }
      >;
  /** `sidebar` = left plugin rail; `bar` = legacy bottom strip */
  layout?: "sidebar" | "bar";
}) {
  const isFa = locale === "fa";
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { selectedItem, appState } = usePuck();
  const sidebar = layout === "sidebar";

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
    if (sidebar) return;
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusInput, sidebar]);

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
          expectedVersion: version,
          draftHints: buildDraftHintsFromConfig(config),
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
        baseVersion?: number;
        messageFa?: string;
        messageEn?: string;
        error?: string;
      };

      if (!res.ok || !body.ok || !body.actions?.length) {
        setPhase("error");
        setError(
          (isFa ? body.messageFa : body.messageEn) ||
            (isFa
              ? "امکان اعمال این تغییر وجود ندارد."
              : "This change could not be applied safely."),
        );
        return;
      }

      setPhase("ready");
      setProposal({
        summary: body.summary ?? (isFa ? "پیشنهاد AI" : "AI proposal"),
        actions: body.actions,
        summaries: body.summaries ?? [],
        mode: body.mode ?? "llm",
        baseVersion:
          typeof body.baseVersion === "number" ? body.baseVersion : version,
        localRevision,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setPhase("cancelled");
        setTimeout(() => setPhase("idle"), 0);
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
    localRevision,
    isFa,
  ]);

  const apply = useCallback(async () => {
    if (!proposal) return;
    setPhase("applying");
    try {
      const result = await onApplyProposal(proposal);
      const normalized =
        typeof result === "boolean"
          ? { ok: result as boolean }
          : result;
      if (!normalized.ok) {
        if (normalized.reason === "stale") {
          setPhase("stale");
          setError(
            normalized.message ||
              (isFa
                ? "این پیشنهاد قدیمی شده است؛ لطفاً دوباره تلاش کنید."
                : "This proposal is out of date. Please regenerate and try again."),
          );
          setProposal(null);
          return;
        }
        setPhase("error");
        setError(
          normalized.message ||
            (isFa
              ? "امکان اعمال این تغییر وجود ندارد."
              : "This change could not be applied safely."),
        );
        return;
      }
      setPhase("success");
      setProposal(null);
      setPrompt("");
      window.setTimeout(() => setPhase("idle"), 1200);
    } catch {
      setPhase("error");
      setError(
        isFa
          ? "امکان اعمال این تغییر وجود ندارد."
          : "This change could not be applied safely.",
      );
    }
  }, [proposal, onApplyProposal, isFa]);

  const examples = isFa ? EXAMPLES_FA : EXAMPLES_EN;
  const busy = phase === "thinking" || phase === "applying";

  const proposalBlock =
    proposal && phase === "ready" ? (
      <div
        className={cn(
          "border-zinc-100 bg-zinc-50",
          sidebar ? "rounded-lg border p-3" : "border-b px-4 py-3",
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            sidebar ? "flex-col" : "items-start justify-between",
          )}
        >
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
            <p className="mt-0.5 text-[11px] text-zinc-500">{proposal.summary}</p>
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
          <div className={cn("flex gap-2", sidebar && "w-full")}>
            <button
              type="button"
              onClick={cancel}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50",
                sidebar && "flex-1",
              )}
            >
              <X className="size-3.5" />
              {isFa ? "لغو" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-md bg-[var(--puck-color-interactive,#0158ad)] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--puck-color-interactive-hover,#014292)]",
                sidebar && "flex-1",
              )}
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
    ) : null;

  const errorBlock =
    (phase === "error" || phase === "stale" || error) && phase !== "ready" ? (
      <div
        role="alert"
        className={cn(
          "flex items-start gap-2 text-xs",
          sidebar ? "rounded-lg border px-3 py-2" : "border-b px-4 py-2",
          phase === "stale"
            ? "border-amber-100 bg-amber-50 text-amber-900"
            : "border-red-100 bg-red-50 text-red-800",
        )}
      >
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <span className="flex-1">{error}</span>
        <button type="button" className="underline" onClick={cancel}>
          {isFa ? "بستن" : "Dismiss"}
        </button>
      </div>
    ) : null;

  const inputBlock = (
    <div className={cn(!sidebar && "px-4 py-2.5")}>
      <label htmlFor={inputId} className="sr-only">
        {isFa ? "دستور AI" : "AI command"}
      </label>
      <div
          className={cn(
            "border border-zinc-300 bg-zinc-50/90 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900",
            sidebar
              ? "flex flex-col gap-2 rounded-2xl p-3 shadow-[0_0_0_1px_rgba(24,24,27,0.03)]"
              : "flex items-center gap-2 rounded-xl px-3 py-2",
          )}
      >
        <div className={cn("flex items-start gap-2", sidebar && "w-full")}>
          <Sparkles
            className={cn(
              "mt-0.5 size-4 shrink-0",
              phase === "success" ? "text-emerald-600" : "text-zinc-400",
            )}
            aria-hidden
          />
          {sidebar ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              id={inputId}
              value={prompt}
              disabled={busy}
              rows={4}
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
                phase === "thinking"
                  ? isFa
                    ? "در حال بررسی درخواست…"
                    : "Reviewing your request…"
                  : selectedSectionId
                    ? isFa
                      ? "چه تغییری روی سکشن انتخاب‌شده؟"
                      : "What should change on the selected section?"
                    : isFa
                      ? "چه تغییری می‌خواهی؟"
                      : "What do you want to change?"
              }
              className="min-h-[88px] min-w-0 flex-1 resize-y bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-60"
              dir="auto"
              autoComplete="off"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
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
                phase === "thinking"
                  ? isFa
                    ? "در حال بررسی درخواست…"
                    : "Reviewing your request…"
                  : selectedSectionId
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
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-2",
            sidebar ? "w-full justify-between" : "shrink-0",
          )}
        >
          {busy ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-zinc-500" />
          ) : sidebar ? (
            <span className="text-[10px] text-zinc-400">
              {isFa ? "⌘↵ پیشنهاد · ⌘K فوکوس" : "⌘↵ propose · ⌘K focus"}
            </span>
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
              className={cn(
                "shrink-0 rounded-md bg-[var(--puck-color-interactive,#0158ad)] px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--puck-color-interactive-hover,#014292)] disabled:opacity-40",
                sidebar && "ms-auto",
              )}
            >
              {isFa ? "پیشنهاد" : "Propose"}
            </button>
          )}
        </div>
      </div>
      {phase === "idle" && !proposal ? (
        <div className={cn("flex flex-wrap gap-1.5", sidebar ? "mt-3" : "mt-2")}>
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
          {isFa
            ? "اعمال شد. با ⌘Z می‌توانید برگردانید."
            : "Applied. Undo with ⌘Z."}
        </p>
      ) : null}
    </div>
  );

  if (sidebar) {
    return (
      <div
        className="flex h-full min-h-0 flex-col bg-white text-zinc-900"
        data-puck-ai-bar
        dir={isFa ? "rtl" : "ltr"}
      >
        <div className="shrink-0 border-b border-[var(--puck-color-border,#dcdcdc)] bg-[var(--puck-color-surface-subtle,#fafafa)] px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--puck-color-text,#181818)]">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-[var(--puck-color-interactive-subtle,#e7eef7)] text-[var(--puck-color-interactive,#0158ad)]">
              <Sparkles className="size-3.5" />
            </span>
            {isFa ? "طراح هوشمند" : "AI Co-Designer"}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--puck-color-text-muted,#767676)]">
            {isFa
              ? "تغییر را بنویس؛ پیشنهاد را ببین و اعمال کن."
              : "Describe a change, review the proposal, then apply."}
          </p>
          {selectedSectionId ? (
            <p className="mt-2 inline-flex rounded-md bg-[var(--puck-color-interactive-subtle,#e7eef7)] px-2 py-0.5 text-[10px] font-medium text-[var(--puck-color-interactive,#0158ad)]">
              {isFa ? "هدف: سکشن انتخاب‌شده" : "Target: selected section"}
            </p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {inputBlock}
          {errorBlock}
          {proposalBlock}
        </div>
      </div>
    );
  }

  return (
    <div
      className="puck-ai-bar shrink-0 border-t border-zinc-200 bg-white"
      data-puck-ai-bar
      dir={isFa ? "rtl" : "ltr"}
    >
      {proposalBlock}
      {errorBlock}
      {inputBlock}
    </div>
  );
}
