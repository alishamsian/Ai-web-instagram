"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ExternalLink,
  Gauge,
  History,
  Loader2,
  Monitor,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { usePuck } from "@puckeditor/core";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

export type PuckSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const VIEWPORTS = [
  { id: "desktop" as const, width: 1440, icon: Monitor, label: { fa: "دسکتاپ", en: "Desktop" } },
  { id: "tablet" as const, width: 768, icon: Tablet, label: { fa: "تبلت", en: "Tablet" } },
  { id: "mobile" as const, width: 390, icon: Smartphone, label: { fa: "موبایل", en: "Mobile" } },
];

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];

export function PuckTopBar({
  locale,
  websiteId,
  brandName,
  slug,
  saveState,
  errorMessage,
  onSave,
  onPublish,
  publishing,
  isPublished,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenHistory,
  onOpenQuality,
}: {
  locale: Locale;
  websiteId: string;
  brandName: string;
  slug: string;
  saveState: PuckSaveState;
  errorMessage: string | null;
  onSave: () => void;
  onPublish?: () => void;
  publishing?: boolean;
  isPublished?: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenHistory?: () => void;
  onOpenQuality?: () => void;
}) {
  const isFa = locale === "fa";
  const { dispatch, appState } = usePuck();
  const currentWidth = appState.ui.viewports.current.width;

  const saveLabel =
    saveState === "saved"
      ? isFa
        ? "ذخیره شد"
        : "Saved"
      : saveState === "saving"
        ? isFa
          ? "در حال ذخیره…"
          : "Saving…"
        : saveState === "dirty"
          ? isFa
            ? "تغییرات ذخیره‌نشده"
            : "Unsaved changes"
          : saveState === "error"
            ? isFa
              ? "خطا در ذخیره"
              : "Save failed"
            : isFa
              ? "آماده"
              : "Ready";

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-[#111113] px-3 py-2 text-zinc-100">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-50">
          {brandName || slug}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {isFa ? "ویرایشگر حرفه‌ای · Puck" : "Professional editor · Puck"}
        </p>
      </div>

      <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
        <IconBtn
          label={isFa ? "واگرد" : "Undo"}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 className="size-3.5" />
        </IconBtn>
        <IconBtn
          label={isFa ? "ازنو" : "Redo"}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 className="size-3.5" />
        </IconBtn>
        {onOpenHistory ? (
          <IconBtn label={isFa ? "تاریخچه" : "History"} onClick={onOpenHistory}>
            <History className="size-3.5" />
          </IconBtn>
        ) : null}
        {onOpenQuality ? (
          <IconBtn label={isFa ? "کیفیت" : "Quality"} onClick={onOpenQuality}>
            <Gauge className="size-3.5" />
          </IconBtn>
        ) : null}
      </div>

      <div
        className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5"
        role="group"
        aria-label={isFa ? "نمای دستگاه" : "Device viewport"}
      >
        {VIEWPORTS.map((vp) => {
          const Icon = vp.icon;
          const active = currentWidth === vp.width;
          return (
            <IconBtn
              key={vp.id}
              label={vp.label[locale]}
              active={active}
              onClick={() =>
                dispatch({
                  type: "setUi",
                  ui: {
                    viewports: {
                      ...appState.ui.viewports,
                      current: { width: vp.width, height: "auto" },
                    },
                  },
                })
              }
            >
              <Icon className="size-3.5" />
            </IconBtn>
          );
        })}
      </div>

      <div
        className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5"
        role="group"
        aria-label={isFa ? "زوم" : "Zoom"}
      >
        <IconBtn
          label={isFa ? "کوچک‌نمایی" : "Zoom out"}
          onClick={() => {
            const prev =
              [...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.01) ??
              ZOOM_STEPS[0]!;
            onZoomChange(prev);
          }}
        >
          <ZoomOut className="size-3.5" />
        </IconBtn>
        <button
          type="button"
          className="min-w-[3rem] px-1 text-center text-[11px] font-medium text-zinc-300"
          onClick={() => onZoomChange(1)}
          title={isFa ? "۱۰۰٪" : "100%"}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconBtn
          label={isFa ? "بزرگ‌نمایی" : "Zoom in"}
          onClick={() => {
            const next =
              ZOOM_STEPS.find((z) => z > zoom + 0.01) ?? ZOOM_STEPS.at(-1)!;
            onZoomChange(next);
          }}
        >
          <ZoomIn className="size-3.5" />
        </IconBtn>
      </div>

      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-medium",
          saveState === "saved" && "bg-emerald-500/15 text-emerald-300",
          saveState === "saving" && "bg-sky-500/15 text-sky-300",
          saveState === "dirty" && "bg-amber-500/15 text-amber-300",
          saveState === "error" && "bg-red-500/15 text-red-300",
          saveState === "idle" && "bg-zinc-800 text-zinc-400",
        )}
        title={errorMessage ?? undefined}
      >
        {saveState === "saving" ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            {saveLabel}
          </span>
        ) : (
          saveLabel
        )}
      </span>

      <button
        type="button"
        onClick={onSave}
        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {isFa ? "ذخیره" : "Save"}
      </button>

      {onPublish ? (
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50"
        >
          {publishing
            ? isFa
              ? "…"
              : "…"
            : isPublished
              ? isFa
                ? "لغو انتشار"
                : "Unpublish"
              : isFa
                ? "انتشار"
                : "Publish"}
        </button>
      ) : null}

      <Link
        href={`/${locale}/preview/${websiteId}`}
        target="_blank"
        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        <ExternalLink className="size-3.5" />
        {isFa ? "پیش‌نمایش" : "Preview"}
      </Link>

      <Link
        href={`/${locale}/editor/${websiteId}`}
        className="inline-flex items-center gap-1 rounded-md border border-amber-700/50 bg-amber-950/40 px-2.5 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-900/50"
      >
        <ArrowLeftRight className="size-3.5" />
        {isFa ? "کلاسیک" : "Classic"}
      </Link>
    </header>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-zinc-300 transition",
        active && "bg-white text-zinc-900 shadow-sm",
        !active && "hover:bg-zinc-800 hover:text-white",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}
