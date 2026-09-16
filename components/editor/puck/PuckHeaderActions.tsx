"use client";

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

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase sm:inline-flex",
          saveState === "saved" && "bg-emerald-500/15 text-emerald-300",
          saveState === "saving" && "bg-sky-500/15 text-sky-300",
          saveState === "dirty" && "bg-amber-500/15 text-amber-200",
          saveState === "error" && "bg-red-500/15 text-red-300",
          saveState === "idle" && "bg-white/5 text-zinc-400",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
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
            {isFa ? "ذخیره…" : "Saving…"}
          </span>
        ) : saveState === "dirty" ? (
          isFa ? "ذخیره‌نشده" : "Unsaved"
        ) : saveState === "saved" ? (
          isFa ? "ذخیره شد" : "Saved"
        ) : saveState === "error" ? (
          isFa ? "خطا" : "Error"
        ) : (
          isFa ? "آماده" : "Ready"
        )}
      </span>

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
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50",
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

      <div className="ms-0.5 flex items-center [&_button]:!text-zinc-300 [&_button:hover]:!bg-white/10 [&_button:hover]:!text-white">
        {children}
      </div>
    </div>
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
