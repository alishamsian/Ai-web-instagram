"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/config/env";
import { EDITOR_VIEWPORT_PRESETS, type EditorViewportId } from "@/lib/editor";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  Command,
  ExternalLink,
  Gauge,
  History,
  Redo2,
  Undo2,
} from "lucide-react";

export function EditorTopBar({
  locale,
  websiteId,
  websiteSlug,
  brandName,
  isPublished,
  dirty,
  saveLabel,
  saveError,
  canUndo,
  canRedo,
  viewport,
  publishing,
  publishLabel,
  previewLabel,
  liveLabel,
  backLabel,
  onUndo,
  onRedo,
  onRetrySave,
  onViewportChange,
  onHistory,
  onQuality,
  onCommandPalette,
  onPublish,
}: {
  locale: Locale;
  websiteId: string;
  websiteSlug: string;
  brandName: string;
  isPublished: boolean;
  dirty: boolean;
  saveLabel: string;
  saveError: boolean;
  canUndo: boolean;
  canRedo: boolean;
  viewport: EditorViewportId;
  publishing: boolean;
  publishLabel: string;
  previewLabel: string;
  liveLabel: string;
  backLabel: string;
  onUndo: () => void;
  onRedo: () => void;
  onRetrySave: () => void;
  onViewportChange: (id: EditorViewportId) => void;
  onHistory: () => void;
  onQuality: () => void;
  onCommandPalette: () => void;
  onPublish: () => void;
}) {
  const isFa = locale === "fa";
  const current =
    EDITOR_VIEWPORT_PRESETS.find((p) => p.id === viewport) ??
    EDITOR_VIEWPORT_PRESETS.find((p) => p.id === "1280")!;

  return (
    <header className="editor-topbar relative z-30 hidden h-12 shrink-0 items-center gap-3 border-b border-[color:var(--ed-border)] bg-[color:var(--ed-bg)] px-3 md:flex">
      {/* Left: back + identity */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href={`/${locale}/dashboard/website?id=${websiteId}`}
          className="editor-icon-btn"
          title={backLabel}
          aria-label={backLabel}
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium tracking-[-0.01em] text-[color:var(--ed-fg)]">
            {brandName}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                saveError
                  ? "bg-red-400"
                  : dirty
                    ? "bg-amber-400"
                    : "bg-emerald-400/90",
              )}
            />
            <p
              className={cn(
                "truncate text-[10px] tabular-nums",
                saveError
                  ? "text-red-300"
                  : dirty
                    ? "text-amber-200/90"
                    : "text-[color:var(--ed-muted)]",
              )}
            >
              {saveLabel}
            </p>
            {saveError ? (
              <button
                type="button"
                onClick={onRetrySave}
                className="text-[10px] text-[color:var(--ed-accent)] hover:underline"
              >
                {isFa ? "تلاش مجدد" : "Retry"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Center: history + viewport */}
      <div className="flex items-center gap-1.5">
        <div className="editor-tool-group">
          <TopIcon
            label={`${isFa ? "بازگردانی" : "Undo"} ⌘Z`}
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 size={14} />
          </TopIcon>
          <TopIcon
            label={`${isFa ? "جلو" : "Redo"} ⌘⇧Z`}
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 size={14} />
          </TopIcon>
        </div>

        <div className="relative">
          <label className="editor-viewport-select">
            <span className="sr-only">
              {isFa ? "عرض صفحه" : "Viewport width"}
            </span>
            <select
              value={viewport === "custom" ? "1280" : viewport}
              onChange={(e) =>
                onViewportChange(e.target.value as EditorViewportId)
              }
              className="appearance-none bg-transparent pe-6 ps-2.5 text-[11px] font-medium text-[color:var(--ed-fg)] outline-none"
            >
              {EDITOR_VIEWPORT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label[locale]} · {preset.width}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[color:var(--ed-muted)]"
            />
          </label>
          <span className="ms-1.5 hidden text-[10px] tabular-nums text-[color:var(--ed-muted)] xl:inline">
            {current.width}px
          </span>
        </div>
      </div>

      {/* Right: tools + publish */}
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <div className="editor-tool-group">
          <TopIcon
            label={isFa ? "فرمان‌ها ⌘K" : "Commands ⌘K"}
            onClick={onCommandPalette}
          >
            <Command size={14} />
          </TopIcon>
          <TopIcon
            label={isFa ? "تاریخچه" : "History"}
            onClick={onHistory}
          >
            <History size={14} />
          </TopIcon>
          <TopIcon
            label={isFa ? "کیفیت" : "Quality"}
            onClick={onQuality}
          >
            <Gauge size={14} />
          </TopIcon>
        </div>

        <Link
          href={`/${locale}/preview/${websiteId}`}
          target="_blank"
          className="editor-ghost-btn"
          title={`${previewLabel} ⌘P`}
        >
          <ExternalLink size={13} />
          <span className="hidden lg:inline">{previewLabel}</span>
        </Link>

        {isPublished ? (
          <a
            href={`/s/${websiteSlug}`}
            target="_blank"
            rel="noreferrer"
            className="editor-ghost-btn hidden xl:inline-flex"
          >
            {liveLabel}
          </a>
        ) : null}

        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="editor-publish-btn"
        >
          {publishLabel}
        </button>
      </div>
    </header>
  );
}

function TopIcon({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="editor-icon-btn"
    >
      {children}
    </button>
  );
}
