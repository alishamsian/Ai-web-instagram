"use client";

import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { sectionTypeIcon } from "@/components/editor/section-icons";
import { SidebarSearch } from "@/components/editor/left-sidebar/SidebarSearch";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
import { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
import type { SectionCategory } from "@/lib/store/registry/types";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import { cn } from "@/lib/utils";

export function AddPanel({
  config,
  dict,
  locale,
  onInsertType,
  onOpenLibrary,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  onInsertType: (type: WebsiteSectionType) => void;
  onOpenLibrary: () => void;
}) {
  const [category, setCategory] = useState<SectionCategory | "all">("all");
  const [query, setQuery] = useState("");
  const vertical = config.settings.vertical ?? null;
  const existing = useMemo(
    () => new Set(config.sections.map((s) => s.type)),
    [config.sections],
  );

  const library = useMemo(
    () => getSectionLibraryItems({ vertical }),
    [vertical],
  );

  const categories = useMemo(() => {
    const used = new Set(library.map((item) => item.category));
    return SECTION_CATEGORIES.filter((item) => used.has(item.id));
  }, [library]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.label.en.toLowerCase().includes(q) ||
        item.label.fa.includes(query.trim()) ||
        item.description.en.toLowerCase().includes(q) ||
        item.description.fa.includes(query.trim()) ||
        item.type.includes(q)
      );
    });
  }, [category, library, query]);

  return (
    <div className="editor-left-panel-body">
      <SidebarSearch
        value={query}
        onChange={setQuery}
        placeholder={dict.editor.searchSections}
        label={dict.editor.searchSections}
      />

      <div
        className="editor-add-cats"
        role="toolbar"
        aria-label={dict.editor.allCategories}
      >
        <button
          type="button"
          data-active={category === "all"}
          className="editor-add-cat"
          onClick={() => setCategory("all")}
        >
          {dict.editor.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-active={category === cat.id}
            className="editor-add-cat"
            onClick={() => setCategory(cat.id)}
          >
            {cat[locale]}
          </button>
        ))}
      </div>

      <ul className="editor-left-row-list" role="list">
        {items.map((item) => {
          const present = existing.has(item.type);
          const Icon = sectionTypeIcon(item.type);
          return (
            <li key={item.type}>
              <button
                type="button"
                onClick={() => onInsertType(item.type)}
                className={cn(
                  "editor-add-row",
                  present && "editor-add-row--present",
                )}
                aria-label={
                  present
                    ? `${item.label[locale]} — ${dict.editor.sectionAdded}`
                    : `${dict.editor.addSection}: ${item.label[locale]}`
                }
              >
                <span className="editor-add-row__icon" aria-hidden>
                  <Icon size={14} strokeWidth={1.75} />
                </span>
                <span className="editor-add-row__copy">
                  <span className="editor-add-row__name">
                    {item.label[locale]}
                  </span>
                  <span className="editor-add-row__desc">
                    {item.description[locale]}
                  </span>
                </span>
                <span className="editor-add-row__action" aria-hidden>
                  {present ? (
                    <Check size={14} strokeWidth={2} />
                  ) : (
                    <Plus size={14} strokeWidth={2} />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!items.length ? (
        <p className="editor-left-empty">{dict.editor.noSectionsMatch}</p>
      ) : null}

      <button
        type="button"
        onClick={onOpenLibrary}
        className="editor-left-secondary-btn"
      >
        {dict.editor.browseAllSections}
      </button>
    </div>
  );
}
