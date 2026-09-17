"use client";

/**
 * Header actions matching the official Puck demo pattern:
 * secondary outline controls + default Publish (`children`).
 * https://demo.puckeditor.com/edit
 */

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
          "hidden items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium sm:inline-flex",
          saveState === "saved" && "text-[var(--puck-color-green-04,#0c680c)]",
          saveState === "saving" && "text-[var(--puck-color-azure-04,#0158ad)]",
          saveState === "dirty" && "text-[var(--puck-color-yellow-04,#645a00)]",
          saveState === "error" && "text-[var(--puck-color-rose-04,#a81a66)]",
          saveState === "idle" && "text-[var(--puck-color-text-muted,#767676)]",
        )}
        title={
          saveState === "saving"
            ? isFa
              ? "در حال ذخیره…"
              : "Saving…"
            : saveState === "dirty"
              ? isFa
                ? "ذخیره‌نشده"
                : "Unsaved"
              : saveState === "saved"
                ? isFa
                  ? "ذخیره شد"
                  : "Saved"
                : saveState === "error"
                  ? isFa
                    ? "خطا"
                    : "Error"
                  : undefined
        }
      >
        {saveState === "saving" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : null}
        {saveState === "saving"
          ? isFa
            ? "ذخیره…"
            : "Saving…"
          : saveState === "dirty"
            ? isFa
              ? "ذخیره‌نشده"
              : "Unsaved"
            : saveState === "saved"
              ? isFa
                ? "ذخیره شد"
                : "Saved"
              : saveState === "error"
                ? isFa
                  ? "خطا"
                  : "Error"
                : null}
      </span>

      <IconAction
        onClick={onOpenHistory}
        title={isFa ? "تاریخچه" : "History"}
      >
        <History className="size-4" />
      </IconAction>
      <IconAction
        onClick={onOpenQuality}
        title={isFa ? "کیفیت" : "Quality"}
      >
        <Gauge className="size-4" />
      </IconAction>
      <IconAction onClick={onSave} title={isFa ? "ذخیره" : "Save"}>
        {saveState === "saving" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
      </IconAction>

      <Link
        href={`/${locale}/preview/${websiteId}`}
        target="_blank"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--puck-color-border,#dcdcdc)] bg-[var(--puck-color-surface,#fff)] px-3 text-xs font-medium text-[var(--puck-color-text,#181818)] transition hover:bg-[var(--puck-color-grey-11,#f5f5f5)]"
      >
        <ExternalLink className="size-3.5 opacity-70" />
        {isFa ? "مشاهده صفحه" : "View page"}
      </Link>

      <Link
        href={`/${locale}/editor/${websiteId}`}
        title={isFa ? "ویرایشگر کلاسیک" : "Classic editor"}
        className="inline-flex size-8 items-center justify-center rounded-md text-[var(--puck-color-text-muted,#767676)] transition hover:bg-[var(--puck-color-grey-11,#f5f5f5)] hover:text-[var(--puck-color-text,#181818)]"
      >
        <ArrowLeftRight className="size-4" />
      </Link>

      {isPublished ? (
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--puck-color-border,#dcdcdc)] bg-[var(--puck-color-surface,#fff)] px-3 text-xs font-medium text-[var(--puck-color-text,#181818)] transition hover:bg-[var(--puck-color-grey-11,#f5f5f5)] disabled:opacity-50"
        >
          {publishing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          {isFa ? "لغو انتشار" : "Unpublish"}
        </button>
      ) : (
        children
      )}
    </div>
  );
}

function IconAction({
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
      className="inline-flex size-8 items-center justify-center rounded-md text-[var(--puck-color-text-muted,#767676)] transition hover:bg-[var(--puck-color-grey-11,#f5f5f5)] hover:text-[var(--puck-color-text,#181818)]"
    >
      {children}
    </button>
  );
}
