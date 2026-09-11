"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import type { WebsiteConfig } from "@/types/website";
import { cn } from "@/lib/utils";

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

type EditorEditApi = {
  enabled: boolean;
  selected?: EditorFieldPath;
  onSelect: (path: EditorFieldPath) => void;
  onChangeText: (path: EditorFieldPath, value: string) => void;
};

const EditorEditContext = createContext<EditorEditApi | null>(null);

export function EditorEditProvider({
  enabled,
  selected,
  config,
  onChange,
  onSelect,
  children,
}: {
  enabled: boolean;
  selected?: EditorFieldPath;
  config: WebsiteConfig;
  onChange: (next: WebsiteConfig) => void;
  onSelect: (path: EditorFieldPath) => void;
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

  return (
    <EditorEditContext.Provider
      value={{ enabled, selected, onSelect, onChangeText }}
    >
      {children}
    </EditorEditContext.Provider>
  );
}

export function useEditorEdit() {
  return useContext(EditorEditContext);
}

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
  if (!edit?.enabled) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      className={cn(
        className,
        "outline-none ring-offset-2 transition",
        edit.selected === path && "ring-2 ring-[#FF6B57]/70",
        "cursor-text hover:outline hover:outline-1 hover:outline-[#FF6B57]/40",
      )}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => edit.onSelect(path)}
      onDoubleClick={(event) => {
        event.preventDefault();
        edit.onSelect(path);
      }}
      onBlur={(event) => {
        const text = event.currentTarget.textContent ?? "";
        if (text !== value) edit.onChangeText(path, text);
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    >
      {value}
    </Tag>
  );
}
