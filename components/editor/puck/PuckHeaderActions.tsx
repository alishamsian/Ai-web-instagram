"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeftRight,
  ExternalLink,
  Gauge,
  History,
  Loader2,
  Save,
} from "lucide-react";
import type { Locale } from "@/lib/config/env";
import type { PuckSaveState } from "@/components/editor/puck/PuckTopBar";
import { cn } from "@/lib/utils";

export function PuckHeaderActions({
  locale,
  websiteId,
  saveState,
  publishing,
  isPublished,
  onSave,
  onPublish,
  onOpenHistory,
  onOpenQuality,
  children,
}: {
  locale: Locale;
  websiteId: string;
  saveState: PuckSaveState;
  publishing: boolean;
  isPublished: boolean;
  onSave: () => void;
  onPublish: () => void;
  onOpenHistory: () => void;
  onOpenQuality: () => void;
  children: React.ReactNode;
}) {
  const isFa = locale === "fa";
  const [dockHost, setDockHost] = useState<Element | null>(null);

  // Portal out of MenuBar (display:none when closed on phone).
  useEffect(() => {
    setDockHost(document.querySelector(".puck-editor-shell"));
  }, []);

  const mobileDock = (
    <div
      className="puck-mobile-dock"
      role="toolbar"
      aria-label={isFa ? "ابزارهای سریع" : "Quick actions"}
    >
      <StatusPill locale={locale} saveState={saveState} compact />
      <HeaderBtn onClick={onSave} title={isFa ? "ذخیره" : "Save"}>
        {saveState === "saving" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Save className="size-3.5" />
        )}
      </HeaderBtn>
      <button
        type="button"
        onClick={onPublish}
        disabled={publishing}
        className={cn(
          "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50",
          isPublished
            ? "border border-white/15 bg-white/5 text-zinc-100"
            : "bg-[var(--vitrin-accent,#c4a574)] text-zinc-950",
        )}
      >
        {publishing ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isPublished ? (
          isFa ? "لغو انتشار" : "Unpublish"
        ) : (
          isFa ? "انتشار" : "Publish"
        )}
      </button>
      <Link
        href={`/${locale}/preview/${websiteId}`}
        target="_blank"
        title={isFa ? "پیش‌نمایش" : "Preview"}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-200"
      >
        <ExternalLink className="size-3.5" />
      </Link>
    </div>
  );

  return (
    <>
      {dockHost ? createPortal(mobileDock, dockHost) : null}

      {/* In-MenuBar / desktop tools */}
      <div className="puck-header-actions flex w-full flex-col gap-2 min-[638px]:w-auto min-[638px]:flex-row min-[638px]:flex-wrap min-[638px]:items-center min-[638px]:justify-end">
        <StatusPill
          locale={locale}
          saveState={saveState}
          className="hidden min-[638px]:inline-flex"
        />

        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
          <HeaderBtn onClick={onOpenHistory} title={isFa ? "تاریخچه" : "History"}>
            <History className="size-3.5" />
          </HeaderBtn>
          <HeaderBtn onClick={onOpenQuality} title={isFa ? "کیفیت" : "Quality"}>
            <Gauge className="size-3.5" />
          </HeaderBtn>
          <HeaderBtn onClick={onSave} title={isFa ? "ذخیره" : "Save"}>
            <Save className="size-3.5" />
          </HeaderBtn>
        </div>

        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          title={
            isPublished
              ? isFa
                ? "لغو انتشار"
                : "Unpublish"
              : isFa
                ? "انتشار"
                : "Publish"
          }
          className={cn(
            "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50 min-[638px]:h-8 min-[638px]:w-auto",
            isPublished
              ? "border border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
              : "bg-[var(--vitrin-accent,#c4a574)] text-zinc-950 hover:brightness-110",
          )}
        >
          {publishing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : isPublished ? (
            isFa ? "لغو انتشار" : "Unpublish"
          ) : (
            isFa ? "انتشار" : "Publish"
          )}
        </button>

        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
          <Link
            href={`/${locale}/preview/${websiteId}`}
            target="_blank"
            title={isFa ? "پیش‌نمایش" : "Preview"}
            className="inline-flex size-8 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="size-3.5" />
          </Link>
          <Link
            href={`/${locale}/editor/${websiteId}`}
            title={isFa ? "ویرایشگر کلاسیک" : "Classic editor"}
            className="inline-flex size-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-amber-200"
          >
            <ArrowLeftRight className="size-3.5" />
          </Link>
        </div>

        <div className="ms-0.5 hidden items-center min-[638px]:flex [&_button]:!text-zinc-300 [&_button:hover]:!bg-white/10 [&_button:hover]:!text-white">
          {/* Puck's default Publish — keep for API compat, visually replaced above */}
          <span className="sr-only">{children}</span>
        </div>
      </div>
    </>
  );
}

function StatusPill({
  locale,
  saveState,
  compact,
  className,
}: {
  locale: Locale;
  saveState: PuckSaveState;
  compact?: boolean;
  className?: string;
}) {
  const isFa = locale === "fa";
  return (
    <span
      className={cn(
        "items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
        compact ? "inline-flex max-w-[5.5rem] truncate" : "inline-flex",
        saveState === "saved" && "bg-emerald-500/15 text-emerald-300",
        saveState === "saving" && "bg-sky-500/15 text-sky-300",
        saveState === "dirty" && "bg-amber-500/15 text-amber-200",
        saveState === "error" && "bg-red-500/15 text-red-300",
        saveState === "idle" && "bg-white/5 text-zinc-400",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          saveState === "saved" && "bg-emerald-400",
          saveState === "saving" && "animate-pulse bg-sky-400",
          saveState === "dirty" && "bg-amber-400",
          saveState === "error" && "bg-red-400",
          saveState === "idle" && "bg-zinc-500",
        )}
      />
      {saveState === "saving" ? (
        <span className="inline-flex items-center gap-1 normal-case tracking-normal">
          <Loader2 className="size-3 animate-spin" />
          {!compact && (isFa ? "ذخیره…" : "Saving…")}
        </span>
      ) : saveState === "dirty" ? (
        isFa ? (compact ? "!" : "ذخیره‌نشده") : compact ? "!" : "Unsaved"
      ) : saveState === "saved" ? (
        isFa ? (compact ? "✓" : "ذخیره شد") : compact ? "✓" : "Saved"
      ) : saveState === "error" ? (
        isFa ? "خطا" : "Error"
      ) : (
        isFa ? "آماده" : "Ready"
      )}
    </span>
  );
}

function HeaderBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
