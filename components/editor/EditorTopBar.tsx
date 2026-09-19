"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/config/env";
import {
  deviceFromViewport,
  type EditorPanelWidth,
  type EditorViewportId,
  type EditorZoomMode,
} from "@/lib/editor";
import {
  ArrowLeft,
  Check,
  Columns2,
  Command,
  ExternalLink,
  Gauge,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Moon,
  PanelLeft,
  Redo2,
  SunMedium,
  Undo2,
} from "lucide-react";

const VIEWPORT_PILLS: {
  id: EditorViewportId;
  device: "mobile" | "tablet" | "desktop";
  label: { fa: string; en: string };
}[] = [
  { id: "1280", device: "desktop", label: { fa: "دسکتاپ", en: "Desktop" } },
  { id: "768", device: "tablet", label: { fa: "تبلت", en: "Tablet" } },
  { id: "390", device: "mobile", label: { fa: "موبایل", en: "Mobile" } },
];

export function EditorTopBar({
  locale,
  websiteId,
  websiteSlug,
  brandName,
  status,
  publishedAt,
  dirty,
  saveLabel,
  saveError,
  saving,
  canUndo,
  canRedo,
  viewport,
  zoom,
  splitPreview,
  panelWidth,
  inspectorLight,
  publishing,
  publishLabel,
  previewLabel,
  liveLabel,
  backLabel,
  focusMode,
  focusLabel,
  qualityLabel,
  labels,
  onUndo,
  onRedo,
  onRetrySave,
  onViewportChange,
  onZoomChange,
  onToggleSplit,
  onPanelWidthCycle,
  onToggleInspectorLight,
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
  status: "draft" | "published" | "unpublished";
  publishedAt: string | null;
  dirty: boolean;
  saveLabel: string;
  saveError: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  viewport: EditorViewportId;
  zoom: EditorZoomMode;
  splitPreview: boolean;
  panelWidth: EditorPanelWidth;
  inspectorLight: boolean;
  publishing: boolean;
  publishLabel: string;
  previewLabel: string;
  liveLabel: string;
  backLabel: string;
  focusMode: boolean;
  focusLabel: string;
  qualityLabel: string;
  labels: {
    statusDraft: string;
    statusPublished: string;
    statusUnpublished: string;
    publishedAt: string;
    neverPublished: string;
    zoomFit: string;
    zoom75: string;
    zoom100: string;
    splitPreview: string;
    panelNarrow: string;
    panelNormal: string;
    panelWide: string;
    inspectorLight: string;
    inspectorDark: string;
  };
  onUndo: () => void;
  onRedo: () => void;
  onRetrySave: () => void;
  onViewportChange: (id: EditorViewportId) => void;
  onZoomChange: (zoom: EditorZoomMode) => void;
  onToggleSplit: () => void;
  onPanelWidthCycle: () => void;
  onToggleInspectorLight: () => void;
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const saveState = saveError
    ? "error"
    : saving
      ? "saving"
      : dirty
        ? "dirty"
        : "saved";

  const panelTitle =
    panelWidth === "narrow"
      ? labels.panelNarrow
      : panelWidth === "wide"
        ? labels.panelWide
        : labels.panelNormal;

  const publishedHint = publishedAt
    ? `${labels.publishedAt}: ${formatPublishedAt(publishedAt, locale)}`
    : labels.neverPublished;

  return (
    <header className="editor-topbar relative z-30 hidden shrink-0 items-center gap-2 px-3 md:flex">
      {/* LEFT — identity + saved */}
      <div className="editor-topbar-group min-w-0 flex-1">
        <Link
          href={`/${locale}/dashboard/website?id=${websiteId}`}
          className="editor-icon-btn"
          title={backLabel}
          aria-label={backLabel}
          onClick={(event) => {
            if (!dirty) return;
            const ok = window.confirm(
              locale === "fa"
                ? "تغییرات ذخیره‌نشده داری. خارج می‌شوی؟"
                : "You have unsaved changes. Leave anyway?",
            );
            if (!ok) event.preventDefault();
          }}
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium tracking-[-0.015em] text-[color:var(--ed-fg)]">
            {brandName}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="editor-save-status" data-state={saveState}>
              {saveState === "saved" ? <Check size={11} strokeWidth={2.5} /> : null}
              {saveState === "saving" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : null}
              {saveLabel}
            </span>
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

      {/* CENTER — device */}
      <div className="editor-topbar-group justify-center">
        <div
          className="editor-viewport-pills"
          role="group"
          aria-label={isFa ? "دستگاه" : "Device"}
        >
          {VIEWPORT_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              data-active={!splitPreview && activePill === pill.id}
              className="editor-viewport-pill"
              onClick={() => {
                if (splitPreview) onToggleSplit();
                onViewportChange(pill.id);
              }}
            >
              {pill.label[locale]}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT — undo/redo · preview · publish · more */}
      <div className="editor-topbar-group flex-1 justify-end gap-1.5">
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

        <Link
          href={`/${locale}/preview/${websiteId}`}
          target="_blank"
          className="editor-ghost-btn"
          title={`${previewLabel} ⌘P`}
        >
          <ExternalLink size={13} />
          <span className="hidden lg:inline">{previewLabel}</span>
        </Link>

        <Link
          href={`/${locale}/editor/${websiteId}/visual`}
          className="editor-ghost-btn hidden md:inline-flex"
          title={isFa ? "ویرایشگر بصری" : "Visual Editor"}
        >
          <span className="text-[11px] font-medium tracking-wide">
            {isFa ? "بصری" : "Visual"}
          </span>
        </Link>

        {status === "published" ? (
          <a
            href={`/s/${websiteSlug}`}
            target="_blank"
            rel="noreferrer"
            className="editor-status-pill hidden xl:inline-flex"
            data-state="published"
            title={publishedHint}
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

        <div className="relative" ref={moreRef}>
          <TopIcon
            label={isFa ? "بیشتر" : "More"}
            onClick={() => setMoreOpen((v) => !v)}
            active={moreOpen}
          >
            <MoreHorizontal size={14} />
          </TopIcon>
          {moreOpen ? (
            <div className="editor-more-menu" role="menu">
              <p className="editor-more-menu-label">
                {isFa ? "ابزارها" : "Tools"}
              </p>
              <MenuBtn
                icon={<Command size={13} />}
                label={isFa ? "فرمان‌ها ⌘K" : "Commands ⌘K"}
                onClick={() => {
                  onCommandPalette();
                  setMoreOpen(false);
                }}
              />
              <MenuBtn
                icon={<History size={13} />}
                label={isFa ? "تاریخچه" : "History"}
                onClick={() => {
                  onHistory();
                  setMoreOpen(false);
                }}
              />
              <MenuBtn
                icon={<Gauge size={13} />}
                label={qualityLabel}
                onClick={() => {
                  onQuality();
                  setMoreOpen(false);
                }}
              />
              <MenuBtn
                icon={
                  focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />
                }
                label={`${focusLabel} ⌘\\`}
                active={focusMode}
                onClick={() => {
                  onToggleFocus();
                  setMoreOpen(false);
                }}
              />

              <p className="editor-more-menu-label">
                {isFa ? "نمایش" : "View"}
              </p>
              <MenuBtn
                icon={<Columns2 size={13} />}
                label={labels.splitPreview}
                active={splitPreview}
                onClick={() => {
                  onToggleSplit();
                  setMoreOpen(false);
                }}
              />
              <MenuBtn
                icon={<PanelLeft size={13} />}
                label={panelTitle}
                onClick={() => {
                  onPanelWidthCycle();
                  setMoreOpen(false);
                }}
              />
              <MenuBtn
                icon={
                  inspectorLight ? <Moon size={13} /> : <SunMedium size={13} />
                }
                label={
                  inspectorLight
                    ? labels.inspectorDark
                    : labels.inspectorLight
                }
                active={inspectorLight}
                onClick={() => {
                  onToggleInspectorLight();
                  setMoreOpen(false);
                }}
              />

              <p className="editor-more-menu-label">
                {isFa ? "زوم" : "Zoom"}
              </p>
              {(
                [
                  ["fit", labels.zoomFit],
                  ["75", labels.zoom75],
                  ["100", labels.zoom100],
                ] as const
              ).map(([id, label]) => (
                <MenuBtn
                  key={id}
                  label={label}
                  active={zoom === id}
                  onClick={() => {
                    onZoomChange(id);
                    setMoreOpen(false);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function formatPublishedAt(iso: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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
      className="editor-icon-btn"
    >
      {children}
    </button>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-active={active || undefined}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
