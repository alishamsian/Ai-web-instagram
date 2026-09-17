"use client";

/**
 * Demo-matching header actions: View page + default Publish (`children`).
 * Extra tools stay icon-only and collapse on narrow widths.
 */

import Link from "next/link";
import {
  ArrowLeftRight,
  ExternalLink,
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
  onOpenQuality: _onOpenQuality,
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
  void _onOpenQuality;

  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className={cn(
          "hidden text-[11px] font-medium md:inline",
          saveState === "saved" && "text-[var(--puck-color-green-04,#0c680c)]",
          saveState === "saving" && "text-[var(--puck-color-azure-04,#0158ad)]",
          saveState === "dirty" && "text-[var(--puck-color-yellow-04,#645a00)]",
          saveState === "error" && "text-[var(--puck-color-rose-04,#a81a66)]",
          saveState === "idle" && "text-[var(--puck-color-text-muted,#767676)]",
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
        ) : null}
      </span>

      <button
        type="button"
        title={isFa ? "ذخیره" : "Save"}
        aria-label={isFa ? "ذخیره" : "Save"}
        onClick={onSave}
        className="inline-flex size-8 items-center justify-center rounded-[2px] text-[var(--puck-color-text-muted,#767676)] hover:bg-[var(--puck-color-grey-11,#f5f5f5)] hover:text-[var(--puck-color-text,#181818)]"
      >
        {saveState === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
      </button>

      <button
        type="button"
        title={isFa ? "تاریخچه" : "History"}
        aria-label={isFa ? "تاریخچه" : "History"}
        onClick={onOpenHistory}
        className="hidden size-8 items-center justify-center rounded-[2px] text-[var(--puck-color-text-muted,#767676)] hover:bg-[var(--puck-color-grey-11,#f5f5f5)] hover:text-[var(--puck-color-text,#181818)] sm:inline-flex"
      >
        <History className="size-4" />
      </button>

      <Link
        href={`/${locale}/preview/${websiteId}`}
        target="_blank"
        className="inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-[var(--puck-color-border,#dcdcdc)] bg-white px-3 text-xs font-medium text-[var(--puck-color-text,#181818)] hover:bg-[var(--puck-color-grey-11,#f5f5f5)]"
      >
        <ExternalLink className="size-3.5 opacity-60" />
        {isFa ? "مشاهده صفحه" : "View page"}
      </Link>

      <Link
        href={`/${locale}/editor/${websiteId}`}
        title={isFa ? "کلاسیک" : "Classic"}
        className="hidden size-8 items-center justify-center rounded-[2px] text-[var(--puck-color-text-muted,#767676)] hover:bg-[var(--puck-color-grey-11,#f5f5f5)] lg:inline-flex"
      >
        <ArrowLeftRight className="size-4" />
      </Link>

      {isPublished ? (
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="inline-flex h-8 items-center rounded-[2px] border border-[var(--puck-color-border,#dcdcdc)] bg-white px-3 text-xs font-medium disabled:opacity-50"
        >
          {publishing ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {isFa ? "لغو انتشار" : "Unpublish"}
        </button>
      ) : (
        children
      )}
    </div>
  );
}
