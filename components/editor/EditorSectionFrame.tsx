"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  MoreHorizontal,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!selected) {
      setMenuOpen(false);
      return;
    }
    const node = document.querySelector(
      `[data-editor-section="${CSS.escape(sectionId)}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selected, sectionId]);

  useEffect(() => {
    if (!contextMenu) return;
    function close() {
      setContextMenu(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  if (!enabled || !edit) {
    return <>{children}</>;
  }

  const spacing = readSectionSetting<SectionSpacing>(
    settings,
    "spacing",
    "comfortable",
  );
  const width = readSectionSetting<SectionWidth>(settings, "width", "full");
  const hidden = edit.isSectionVisible?.(sectionId) === false;

  function runAction(
    action: "move-up" | "move-down" | "duplicate" | "toggle" | "delete",
  ) {
    edit?.onSectionAction?.(sectionId, action);
    setMenuOpen(false);
    setContextMenu(null);
  }

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
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        edit.onSelectSection(sectionId);
        setMenuOpen(false);
        setContextMenu({ x: event.clientX, y: event.clientY });
      }}
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
            "editor-section-badge pointer-events-none absolute start-2 top-2 z-20 flex max-w-[min(70%,12rem)] items-center gap-1.5",
            "px-2 py-1 text-[10px] font-medium text-[#F7F7F8] sm:start-3 sm:top-3",
            !selected && "opacity-80",
          )}
        >
          <span className="truncate">{label}</span>
          {hidden ? <EyeOff size={10} className="opacity-70" /> : null}
        </div>
      )}

      {selected && edit.onSectionAction ? (
        <div
          data-editor-chrome
          className="editor-section-toolbar absolute end-2 top-2 z-20 flex items-center gap-0.5 sm:end-3 sm:top-3"
          onClick={(event) => event.stopPropagation()}
        >
          <ChromeButton
            label="Move up"
            onClick={() => runAction("move-up")}
          >
            <ArrowUp size={13} />
          </ChromeButton>
          <ChromeButton
            label="Move down"
            onClick={() => runAction("move-down")}
          >
            <ArrowDown size={13} />
          </ChromeButton>
          <div className="relative">
            <ChromeButton
              label="More"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal size={13} />
            </ChromeButton>
            {menuOpen ? (
              <SectionActionMenu
                hidden={hidden}
                onDuplicate={() => runAction("duplicate")}
                onToggle={() => runAction("toggle")}
                onDelete={() => runAction("delete")}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {contextMenu && edit.onSectionAction ? (
        <div
          data-editor-chrome
          className="editor-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => runAction("move-up")}>
            <ArrowUp size={13} />
            Move up
          </button>
          <button type="button" onClick={() => runAction("move-down")}>
            <ArrowDown size={13} />
            Move down
          </button>
          <button type="button" onClick={() => runAction("duplicate")}>
            <Copy size={13} />
            Duplicate
          </button>
          <button type="button" onClick={() => runAction("toggle")}>
            {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            {hidden ? "Show" : "Hide"}
          </button>
          <button
            type="button"
            data-danger="true"
            onClick={() => runAction("delete")}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      ) : null}

      {children}
    </div>
  );
}

function SectionActionMenu({
  hidden,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  hidden: boolean;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="editor-more-menu">
      <button type="button" onClick={onDuplicate}>
        <Copy size={13} />
        Duplicate
      </button>
      <button type="button" onClick={onToggle}>
        {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
        {hidden ? "Show" : "Hide"}
      </button>
      <button type="button" data-danger="true" onClick={onDelete}>
        <Trash2 size={13} />
        Delete
      </button>
    </div>
  );
}

function ChromeButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-[7px] text-[#B5B5BC] transition hover:bg-white/10 hover:text-[#F7F7F8]"
    >
      {children}
    </button>
  );
}
