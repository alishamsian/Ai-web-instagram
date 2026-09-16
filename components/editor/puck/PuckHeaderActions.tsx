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
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <span
        className={cn(
          "me-1 hidden rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline",
          saveState === "saved" && "bg-emerald-500/15 text-emerald-700",
          saveState === "saving" && "bg-sky-500/15 text-sky-700",
          saveState === "dirty" && "bg-amber-500/15 text-amber-800",
          saveState === "error" && "bg-red-500/15 text-red-700",
          saveState === "idle" && "bg-zinc-500/10 text-zinc-500",
        )}
      >
        {saveState === "saving" ? (
          <span className="inline-flex items-center gap-1">
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

      <HeaderBtn onClick={onOpenHistory} title={isFa ? "تاریخچه" : "History"}>
        <History className="size-3.5" />
      </HeaderBtn>
      <HeaderBtn onClick={onOpenQuality} title={isFa ? "کیفیت" : "Quality"}>
        <Gauge className="size-3.5" />
      </HeaderBtn>

      <HeaderBtn onClick={onSave} title={isFa ? "ذخیره" : "Save"} emphasis>
        <Save className="size-3.5" />
        <span className="hidden sm:inline">{isFa ? "ذخیره" : "Save"}</span>
      </HeaderBtn>

      <HeaderBtn
        onClick={onPublish}
        disabled={publishing}
        title={isPublished ? (isFa ? "لغو انتشار" : "Unpublish") : isFa ? "انتشار" : "Publish"}
        emphasis
      >
        {publishing ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isPublished ? (
          isFa ? "لغو انتشار" : "Unpublish"
        ) : (
          isFa ? "انتشار" : "Publish"
        )}
      </HeaderBtn>

      <Link
        href={`/${locale}/preview/${websiteId}`}
        target="_blank"
        className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <ExternalLink className="size-3.5" />
        <span className="hidden sm:inline">{isFa ? "پیش‌نمایش" : "Preview"}</span>
      </Link>

      <Link
        href={`/${locale}/editor/${websiteId}`}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-950 hover:bg-amber-100"
      >
        <ArrowLeftRight className="size-3.5" />
        <span className="hidden sm:inline">{isFa ? "کلاسیک" : "Classic"}</span>
      </Link>

      {children}
    </div>
  );
}

function HeaderBtn({
  children,
  onClick,
  title,
  disabled,
  emphasis,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition disabled:opacity-50",
        emphasis
          ? "bg-zinc-900 text-white hover:bg-zinc-800"
          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
      )}
    >
      {children}
    </button>
  );
}
