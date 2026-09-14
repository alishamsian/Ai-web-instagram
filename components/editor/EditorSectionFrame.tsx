"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useEditorEdit } from "@/components/editor/EditContext";
import {
  readSectionSetting,
  spacingClass,
  widthClass,
  type SectionSpacing,
  type SectionWidth,
} from "@/components/editor/editor-selection";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";

export function EditorSectionFrame({
  sectionId,
  label,
  children,
  className,
  settings,
}: {
  sectionId: string;
  label: string;
  children: ReactNode;
  className?: string;
  settings?: Record<string, unknown>;
}) {
  const edit = useEditorEdit();
  const enabled = Boolean(edit?.enabled && edit.mode === "editor");
  const selected = enabled && edit?.selectedSectionId === sectionId;
  const hovered =
    enabled && edit?.hoveredSectionId === sectionId && !selected;

  useEffect(() => {
    if (!selected) return;
    const node = document.querySelector(
      `[data-editor-section="${CSS.escape(sectionId)}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected, sectionId]);

  if (!enabled || !edit) {
    return <>{children}</>;
  }

  const spacing = readSectionSetting<SectionSpacing>(
    settings,
    "spacing",
    "comfortable",
  );
  const width = readSectionSetting<SectionWidth>(settings, "width", "full");

  return (
    <div
      data-editor-section={sectionId}
      className={cn(
        "relative transition-[outline,box-shadow] duration-150",
        spacingClass(spacing),
        widthClass(width),
        selected && "editor-section-selected z-10",
        hovered && "editor-section-hover",
        className,
      )}
      onMouseEnter={() => edit.onHoverSection(sectionId)}
      onMouseLeave={() => edit.onHoverSection(undefined)}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[contenteditable='true']")) return;
        if (target.closest("[data-editor-chrome]")) return;
        event.stopPropagation();
        edit.onSelectSection(sectionId);
      }}
    >
      {(selected || hovered) && (
        <div
          data-editor-chrome
          className={cn(
            "editor-section-badge pointer-events-none absolute start-2 top-2 z-20 flex max-w-[min(70%,14rem)] items-center gap-1.5",
            "px-2 py-1 text-[10px] font-medium tracking-[0.04em] text-[#F7F7F8] uppercase sm:start-3 sm:top-3",
          )}
        >
          <GripVertical size={11} className="shrink-0 opacity-50" />
          <span className="truncate normal-case tracking-normal">{label}</span>
        </div>
      )}

      {selected && edit.onSectionAction ? (
        <div
          data-editor-chrome
          className="editor-section-toolbar absolute end-2 top-2 z-20 flex max-w-[calc(100%-5rem)] items-center gap-0.5 overflow-x-auto sm:end-3 sm:top-3 sm:max-w-none"
          onClick={(event) => event.stopPropagation()}
        >
          <ChromeButton
            label="Edit"
            onClick={() => edit.onSelectSection(sectionId)}
          >
            <Pencil size={13} />
          </ChromeButton>
          <ChromeButton
            label="Move up"
            onClick={() => edit.onSectionAction?.(sectionId, "move-up")}
          >
            <ArrowUp size={13} />
          </ChromeButton>
          <ChromeButton
            label="Move down"
            onClick={() => edit.onSectionAction?.(sectionId, "move-down")}
          >
            <ArrowDown size={13} />
          </ChromeButton>
          <ChromeButton
            label="Duplicate"
            onClick={() => edit.onSectionAction?.(sectionId, "duplicate")}
          >
            <Copy size={13} />
          </ChromeButton>
          <ChromeButton
            label="Toggle visibility"
            onClick={() => edit.onSectionAction?.(sectionId, "toggle")}
          >
            {edit.isSectionVisible?.(sectionId) === false ? (
              <EyeOff size={13} />
            ) : (
              <Eye size={13} />
            )}
          </ChromeButton>
          <ChromeButton
            label="Delete"
            danger
            onClick={() => edit.onSectionAction?.(sectionId, "delete")}
          >
            <Trash2 size={13} />
          </ChromeButton>
        </div>
      ) : null}

      {children}
    </div>
  );
}

function ChromeButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[7px] text-[#B5B5BC] transition",
        "hover:bg-white/10 hover:text-[#F7F7F8]",
        danger && "hover:bg-red-500/15 hover:text-red-300",
      )}
    >
      {children}
    </button>
  );
}
