"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/config/env";
import { deviceFromViewport, type EditorViewportId } from "@/lib/editor";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Command,
  ExternalLink,
  Gauge,
  History,
  Maximize2,
  Minimize2,
  Redo2,
  Undo2,
} from "lucide-react";

const VIEWPORT_PILLS: {
  id: EditorViewportId;
  device: "mobile" | "tablet" | "desktop";
  label: { fa: string; en: string };
}[] = [
  { id: "390", device: "mobile", label: { fa: "موبایل", en: "Mobile" } },
  { id: "768", device: "tablet", label: { fa: "تبلت", en: "Tablet" } },
  { id: "1280", device: "desktop", label: { fa: "دسکتاپ", en: "Desktop" } },
];

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
  focusMode,
  focusLabel,
  qualityLabel,
  onUndo,
  onRedo,
  onRetrySave,
  onViewportChange,
  onHistory,
  onQuality,
  onCommandPalette,
  onPublish,
  onToggleFocus,
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
  focusMode: boolean;
  focusLabel: string;
  qualityLabel: string;
  onUndo: () => void;
  onRedo: () => void;
  onRetrySave: () => void;
  onViewportChange: (id: EditorViewportId) => void;
  onHistory: () => void;
  onQuality: () => void;
  onCommandPalette: () => void;
  onPublish: () => void;
  onToggleFocus: () => void;
}) {
  const isFa = locale === "fa";
  const device = deviceFromViewport(viewport);
  const activePill =
    VIEWPORT_PILLS.find((p) => p.device === device)?.id ?? "1280";

  return (
    <header className="editor-topbar relative z-30 hidden h-11 shrink-0 items-center gap-3 border-b border-[color:var(--ed-border)] bg-[color:var(--ed-bg)] px-3 md:flex">
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

      <div className="flex items-center gap-2">
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

        <div className="editor-viewport-pills" role="group" aria-label="Viewport">
          {VIEWPORT_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              data-active={activePill === pill.id}
              className="editor-viewport-pill"
              onClick={() => onViewportChange(pill.id)}
            >
              {pill.label[locale]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <div className="editor-tool-group">
          <TopIcon
            label={isFa ? "فرمان‌ها ⌘K" : "Commands ⌘K"}
            onClick={onCommandPalette}
          >
            <Command size={14} />
          </TopIcon>
          <TopIcon label={isFa ? "تاریخچه" : "History"} onClick={onHistory}>
            <History size={14} />
          </TopIcon>
          <TopIcon label={qualityLabel} onClick={onQuality}>
            <Gauge size={14} />
          </TopIcon>
          <TopIcon
            label={`${focusLabel} ⌘\\`}
            onClick={onToggleFocus}
            active={focusMode}
          >
            {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
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
  active,
}: {
  children: ReactNode;
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
      onClick={onClick}
      disabled={disabled}
      data-active={active || undefined}
      className={cn("editor-icon-btn", active && "bg-white/[0.1] text-[color:var(--ed-fg)]")}
    >
      {children}
    </button>
  );
}
