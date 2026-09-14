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

export type WebsiteRenderMode = "editor" | "preview" | "published";

export type EditorFieldPath =
  | "hero.headline"
  | "hero.subheadline"
  | "hero.cta"
  | "about.title"
  | "about.body"
  | "products.title"
  | "services.title"
  | "gallery.title"
  | "faq.title"
  | "contact.title"
  | "testimonials.title"
  | "promo.kicker"
  | "promo.title"
  | "promo.cta";

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
      const next = structuredClone(config);
      switch (path) {
        case "hero.headline":
          next.content.hero.headline = value;
          break;
        case "hero.subheadline":
          next.content.hero.subheadline = value;
          break;
        case "hero.cta":
          next.content.hero.cta = value;
          break;
        case "about.title":
          if (next.content.about) next.content.about.title = value;
          break;
        case "about.body":
          if (next.content.about) next.content.about.body = value;
          break;
        case "products.title":
          if (next.content.products) next.content.products.title = value;
          break;
        case "services.title":
          if (next.content.services) next.content.services.title = value;
          break;
        case "gallery.title":
          if (next.content.gallery) next.content.gallery.title = value;
          break;
        case "faq.title":
          if (next.content.faq) next.content.faq.title = value;
          break;
        case "contact.title":
          if (next.content.contact) next.content.contact.title = value;
          break;
        case "testimonials.title":
          if (next.content.testimonials) next.content.testimonials.title = value;
          break;
        case "promo.kicker":
          next.content.promo = {
            kicker: value,
            title: next.content.promo?.title ?? "",
            cta: next.content.promo?.cta ?? "",
          };
          break;
        case "promo.title":
          next.content.promo = {
            kicker: next.content.promo?.kicker ?? "",
            title: value,
            cta: next.content.promo?.cta ?? "",
          };
          break;
        case "promo.cta":
          next.content.promo = {
            kicker: next.content.promo?.kicker ?? "",
            title: next.content.promo?.title ?? "",
            cta: value,
          };
          break;
      }
      onChange(next);
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
  const selected = Boolean(edit?.enabled && edit.selected === path);

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

  if (!edit?.enabled || edit.mode !== "editor") {
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
