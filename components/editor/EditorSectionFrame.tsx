"use client";

import { useEffect, useRef, useState, type ReactNode, type DragEvent } from "react";
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
  MoreHorizontal,
  Trash2,
} from "lucide-react";

const DRAG_MIME = "application/x-vitrin-section";

/** Module-level so dragOver works (browsers hide custom MIME types mid-drag). */
let canvasDragSectionId: string | null = null;

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
  const hovered = enabled && edit?.hoveredSectionId === sectionId && !selected;
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dropEdge, setDropEdge] = useState<"before" | "after" | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selected) {
      setMenuOpen(false);
      return;
    }
    const node = frameRef.current;
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected, sectionId]);

  useEffect(() => {
    if (!contextMenu) return;
    function close() {
      setContextMenu(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    function onEnd() {
      setDragging(false);
      setDropEdge(null);
    }
    window.addEventListener("dragend", onEnd);
    return () => window.removeEventListener("dragend", onEnd);
  }, []);

  if (!enabled || !edit) {
    return <>{children}</>;
  }

  const spacing = readSectionSetting<SectionSpacing>(settings, "spacing", "comfortable");
  const width = readSectionSetting<SectionWidth>(settings, "width", "full");
  const hidden = edit.isSectionVisible?.(sectionId) === false;
  const showChrome = selected || hovered || dragging || Boolean(dropEdge);

  function runAction(action: "move-up" | "move-down" | "duplicate" | "toggle" | "delete") {
    edit?.onSectionAction?.(sectionId, action);
    setMenuOpen(false);
    setContextMenu(null);
  }

  function edgeFromEvent(event: DragEvent): "before" | "after" {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return "before";
    const mid = rect.top + rect.height / 2;
    return event.clientY < mid ? "before" : "after";
  }

  return (
    <div
      ref={frameRef}
      data-editor-section={sectionId}
      className={cn(
        "relative transition-[outline,box-shadow,opacity] duration-150",
        spacingClass(spacing),
        widthClass(width),
        selected && "editor-section-selected z-10",
        hovered && "editor-section-hover",
        dragging && "editor-section-dragging",
        dropEdge === "before" && "editor-section-drop-before",
        dropEdge === "after" && "editor-section-drop-after",
        className,
      )}
      onMouseEnter={() => {
        if (!dragging) edit.onHoverSection(sectionId);
      }}
      onMouseLeave={() => {
        if (edit.hoveredSectionId === sectionId) edit.onHoverSection(undefined);
      }}
      onDragOver={(event) => {
        if (!edit.onReorderSections) return;
        if (!canvasDragSectionId || canvasDragSectionId === sectionId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const edge = edgeFromEvent(event);
        setDropEdge((prev) => (prev === edge ? prev : edge));
      }}
      onDragLeave={(event) => {
        const related = event.relatedTarget as Node | null;
        if (related && frameRef.current?.contains(related)) return;
        setDropEdge(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const fromId = event.dataTransfer.getData(DRAG_MIME) || canvasDragSectionId;
        const place = edgeFromEvent(event);
        setDropEdge(null);
        setDragging(false);
        canvasDragSectionId = null;
        if (!fromId || fromId === sectionId) return;
        edit.onReorderSections?.(fromId, sectionId, place);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        edit.onSelectSection(sectionId);
        setMenuOpen(false);
        setContextMenu({ x: event.clientX, y: event.clientY });
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-editor-editable]")) return;
        if (target.closest("[contenteditable='true']")) return;
        if (target.closest("[data-editor-chrome]")) return;
        event.stopPropagation();
        edit.onSelectSection(sectionId);
      }}
    >
      {showChrome ? (
        <div
          data-editor-chrome
          className={cn(
            "editor-section-badge absolute start-2 top-2 z-20 flex max-w-[min(70%,12rem)] items-center gap-1",
            "px-1.5 py-1 text-[10px] font-medium text-[#F7F7F8] sm:start-3 sm:top-3",
            !selected && "opacity-85",
          )}
        >
          {edit.onReorderSections ? (
            <span
              draggable
              className="editor-section-drag-handle pointer-events-auto inline-flex size-5 items-center justify-center rounded text-white/55 hover:text-white"
              title="Drag to reorder"
              aria-label="Drag to reorder"
              onClick={(event) => event.stopPropagation()}
              onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_MIME, sectionId);
                event.dataTransfer.effectAllowed = "move";
                canvasDragSectionId = sectionId;
                setDragging(true);
                edit.onSelectSection(sectionId);
                edit.onHoverSection(undefined);
              }}
              onDragEnd={() => {
                setDragging(false);
                setDropEdge(null);
                canvasDragSectionId = null;
              }}
            >
              <GripVertical size={12} />
            </span>
          ) : null}
          <span className="pointer-events-none truncate">{label}</span>
          {hidden ? <EyeOff size={10} className="opacity-70" /> : null}
        </div>
      ) : null}

      {hovered && !selected && edit.onSectionAction ? (
        <div data-editor-chrome className="editor-section-toolbar absolute end-2 top-2 z-20 flex items-center gap-0.5 sm:end-3 sm:top-3" onClick={(event) => event.stopPropagation()}>
          <ChromeButton label="Toggle visibility" onClick={() => runAction("toggle")}>
            {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
          </ChromeButton>
          <ChromeButton label="More" onClick={() => setMenuOpen((v) => !v)}>
            <MoreHorizontal size={13} />
          </ChromeButton>
          {menuOpen ? (
            <SectionActionMenu
              hidden={hidden}
              onDuplicate={() => runAction("duplicate")}
              onToggle={() => runAction("toggle")}
              onDelete={() => runAction("delete")}
              onMoveUp={() => runAction("move-up")}
              onMoveDown={() => runAction("move-down")}
            />
          ) : null}
        </div>
      ) : null}

      {selected && edit.onSectionAction ? (
        <div data-editor-chrome className="editor-section-toolbar absolute end-2 top-2 z-20 flex items-center gap-0.5 sm:end-3 sm:top-3" onClick={(event) => event.stopPropagation()}>
          <ChromeButton label="Move up" onClick={() => runAction("move-up")}><ArrowUp size={13} /></ChromeButton>
          <ChromeButton label="Move down" onClick={() => runAction("move-down")}><ArrowDown size={13} /></ChromeButton>
          <ChromeButton label="Duplicate" onClick={() => runAction("duplicate")}><Copy size={13} /></ChromeButton>
          <ChromeButton label="Toggle visibility" onClick={() => runAction("toggle")}>
            {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
          </ChromeButton>
          <div className="relative">
            <ChromeButton label="More" onClick={() => setMenuOpen((v) => !v)}><MoreHorizontal size={13} /></ChromeButton>
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
        <div data-editor-chrome className="editor-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => runAction("move-up")}><ArrowUp size={13} />Move up</button>
          <button type="button" onClick={() => runAction("move-down")}><ArrowDown size={13} />Move down</button>
          <button type="button" onClick={() => runAction("duplicate")}><Copy size={13} />Duplicate</button>
          <button type="button" onClick={() => runAction("toggle")}>
            {hidden ? <Eye size={13} /> : <EyeOff size={13} />}
            {hidden ? "Show" : "Hide"}
          </button>
          <button type="button" data-danger="true" onClick={() => runAction("delete")}><Trash2 size={13} />Delete</button>
        </div>
      ) : null}

      {children}
    </div>
  );
}

function SectionActionMenu({ hidden, onDuplicate, onToggle, onDelete, onMoveUp, onMoveDown }: {
  hidden: boolean;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="editor-more-menu">
      {onMoveUp ? <button type="button" onClick={onMoveUp}><ArrowUp size={13} />Move up</button> : null}
      {onMoveDown ? <button type="button" onClick={onMoveDown}><ArrowDown size={13} />Move down</button> : null}
      <button type="button" onClick={onDuplicate}><Copy size={13} />Duplicate</button>
      <button type="button" onClick={onToggle}>{hidden ? <Eye size={13} /> : <EyeOff size={13} />}{hidden ? "Show" : "Hide"}</button>
      <button type="button" data-danger="true" onClick={onDelete}><Trash2 size={13} />Delete</button>
    </div>
  );
}

function ChromeButton({ children, label, onClick }: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="editor-section-toolbar-btn">
      {children}
    </button>
  );
}
