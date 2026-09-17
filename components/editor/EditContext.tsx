"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { WebsiteConfig } from "@/types/website";
import { cn } from "@/lib/utils";
import { commandSetContentPath } from "@/lib/editor/commands";

export type WebsiteRenderMode = "editor" | "preview" | "published";

export type EditorFieldPath =
  | "hero.headline"
  | "hero.subheadline"
  | "hero.cta"
  | "hero.eyebrow"
  | "about.title"
  | "about.body"
  | "products.title"
  | "products.description"
  | "services.title"
  | "gallery.title"
  | "faq.title"
  | "contact.title"
  | "contact.body"
  | "testimonials.title"
  | "promo.kicker"
  | "promo.title"
  | "promo.cta"
  | "trust.title";

export type SectionAction =
  | "duplicate"
  | "toggle"
  | "delete"
  | "move-up"
  | "move-down";

export type SectionDropPlace = "before" | "after";

type EditorEditApi = {
  enabled: boolean;
  mode: WebsiteRenderMode;
  selected?: EditorFieldPath;
  selectedSectionId?: string;
  hoveredSectionId?: string;
  onSelect: (path: EditorFieldPath) => void;
  onSelectSection: (sectionId: string | undefined) => void;
  onHoverSection: (sectionId: string | undefined) => void;
  onChangeText: (path: EditorFieldPath, value: string) => void;
  onSectionAction?: (sectionId: string, action: SectionAction) => void;
  onReorderSections?: (
    fromId: string,
    toId: string,
    place: SectionDropPlace,
  ) => void;
  /** Open section library to insert after this section (null = end / empty). */
  onRequestInsert?: (afterSectionId: string | null) => void;
  onBrowseTemplates?: () => void;
  /** Reveal / focus the inspector for the current selection. */
  onOpenInspector?: () => void;
  isSectionVisible?: (sectionId: string) => boolean;
};

const EditorEditContext = createContext<EditorEditApi | null>(null);

export function EditorEditProvider({
  enabled,
  mode = "editor",
  selected,
  selectedSectionId,
  hoveredSectionId,
  config,
  onChange,
  onSelect,
  onSelectSection,
  onHoverSection,
  onSectionAction,
  onReorderSections,
  onRequestInsert,
  onBrowseTemplates,
  onOpenInspector,
  children,
}: {
  enabled: boolean;
  mode?: WebsiteRenderMode;
  selected?: EditorFieldPath;
  selectedSectionId?: string;
  hoveredSectionId?: string;
  config: WebsiteConfig;
  onChange: (next: WebsiteConfig) => void;
  onSelect: (path: EditorFieldPath) => void;
  onSelectSection: (sectionId: string | undefined) => void;
  onHoverSection: (sectionId: string | undefined) => void;
  onSectionAction?: (sectionId: string, action: SectionAction) => void;
  onReorderSections?: (
    fromId: string,
    toId: string,
    place: SectionDropPlace,
  ) => void;
  onRequestInsert?: (afterSectionId: string | null) => void;
  onBrowseTemplates?: () => void;
  onOpenInspector?: () => void;
  children: ReactNode;
}) {
  const onChangeText = useCallback(
    (path: EditorFieldPath, value: string) => {
      const result = commandSetContentPath(config, path, value);
      if (result) onChange(result.config);
    },
    [config, onChange],
  );

  const isSectionVisible = useCallback(
    (sectionId: string) =>
      config.sections.find((section) => section.id === sectionId)?.visible ??
      true,
    [config.sections],
  );

  return (
    <EditorEditContext.Provider
      value={{
        enabled,
        mode,
        selected,
        selectedSectionId,
        hoveredSectionId,
        onSelect,
        onSelectSection,
        onHoverSection,
        onChangeText,
        onSectionAction,
        onReorderSections,
        onRequestInsert,
        onBrowseTemplates,
        onOpenInspector,
        isSectionVisible,
      }}
    >
      {children}
    </EditorEditContext.Provider>
  );
}

export function useEditorEdit() {
  return useContext(EditorEditContext);
}

/**
 * IDLE → SELECTED (click) → EDITING (double-click)
 * Escape / blur exits editing. Single click never starts editing.
 *
 * Hydration: editor chrome activates only after mount so SSR markup
 * (plain text) always matches the client's first paint. Context can be
 * unavailable or diverge during SSR/streaming; deferring avoids mismatch.
 */
export function EditableText({
  path,
  value,
  as: Tag = "span",
  className,
  multiline = false,
}: {
  path: EditorFieldPath;
  value: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "strong";
  className?: string;
  multiline?: boolean;
}) {
  const edit = useEditorEdit();
  const ref = useRef<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    setInteractive(true);
  }, []);

  const isEditor =
    interactive && Boolean(edit?.enabled && edit.mode === "editor");
  const selected = Boolean(isEditor && edit?.selected === path);

  useEffect(() => {
    if (!selected && editing) setEditing(false);
  }, [selected, editing]);

  useEffect(() => {
    if (!editing) return;
    const node = ref.current;
    if (!node) return;
    if (node.textContent !== value) {
      node.textContent = value;
    }
    node.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    // Intentionally only when entering edit mode — not on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!isEditor) {
    return <Tag className={className}>{value}</Tag>;
  }

  function commit(text: string) {
    if (text !== value) edit!.onChangeText(path, text);
  }

  function onClick(event: ReactMouseEvent) {
    event.stopPropagation();
    if (editing) return;
    event.preventDefault();
    edit!.onSelect(path);
  }

  function onDoubleClick(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    edit!.onSelect(path);
    setEditing(true);
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (ref.current) ref.current.textContent = value;
      setEditing(false);
      ref.current?.blur();
      return;
    }
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      ref.current?.blur();
    }
  }

  return (
    <Tag
      ref={ref as never}
      data-editor-editable={path}
      data-selected={selected || undefined}
      data-editing={editing || undefined}
      className={cn("editor-editable", className)}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={editing}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onBlur={(event) => {
        if (!editing) return;
        const text = event.currentTarget.textContent ?? "";
        commit(text);
        setEditing(false);
      }}
      onKeyDown={onKeyDown}
    >
      {editing ? null : value}
    </Tag>
  );
}
