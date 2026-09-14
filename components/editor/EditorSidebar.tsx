"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import { sectionLabel } from "@/components/editor/editor-utils";
import { SECTION_LAYER_BLOCKS } from "@/components/editor/editor-selection";
import { sectionTypeIcon } from "@/components/editor/section-icons";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

export type LeftNavTab = "pages" | "sections" | "layers";

const EDITOR_PAGES = [
  { id: "home", label: { fa: "خانه", en: "Home" } },
  { id: "shop", label: { fa: "فروشگاه", en: "Shop" } },
  { id: "product", label: { fa: "محصول", en: "Product" } },
  { id: "about", label: { fa: "درباره", en: "About" } },
  { id: "contact", label: { fa: "تماس", en: "Contact" } },
  { id: "faq", label: { fa: "پرسش‌ها", en: "FAQ" } },
] as const;

export function EditorSidebar({
  config,
  dict,
  locale,
  nav,
  selectedSectionId,
  selectedField,
  activePage,
  onNavChange,
  onSelectSection,
  onSelectField,
  onChange,
  onAddSection,
  onPageChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  nav: LeftNavTab;
  selectedSectionId?: string;
  selectedField?: EditorFieldPath;
  activePage: string;
  onNavChange: (tab: LeftNavTab) => void;
  onSelectSection: (id: string | undefined) => void;
  onSelectField: (path: EditorFieldPath, sectionId: string) => void;
  onChange: (next: WebsiteConfig) => void;
  onAddSection: () => void;
  onPageChange: (pageId: string) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const activeTab: "sections" | "pages" =
    nav === "pages" ? "pages" : "sections";

  const tabs: { id: "sections" | "pages"; label: string }[] = [
    { id: "sections", label: dict.editor.sections },
    { id: "pages", label: dict.editor.pages },
  ];

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return config.sections;
    return config.sections.filter((section) => {
      const label = sectionLabel(
        section.type as WebsiteSectionType,
        locale,
      ).toLowerCase();
      return label.includes(q) || section.type.toLowerCase().includes(q);
    });
  }, [config.sections, locale, query]);

  useEffect(() => {
    if (!selectedSectionId) return;
    setExpanded((prev) => ({ ...prev, [selectedSectionId]: true }));
  }, [selectedSectionId, selectedField]);

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const sections = [...config.sections];
    const [item] = sections.splice(from, 1);
    if (!item) return;
    sections.splice(to, 0, item);
    onChange({ ...config, sections });
  }

  function duplicateSection(sectionId: string) {
    const index = config.sections.findIndex((s) => s.id === sectionId);
    const section = config.sections[index];
    if (!section) return;
    const copy = {
      ...section,
      id: `${section.type}-${Date.now().toString(36)}`,
    };
    const sections = [...config.sections];
    sections.splice(index + 1, 0, copy);
    onChange({ ...config, sections });
    onSelectSection(copy.id);
  }

  function deleteSection(sectionId: string) {
    onChange({
      ...config,
      sections: config.sections.filter((s) => s.id !== sectionId),
    });
    if (selectedSectionId === sectionId) onSelectSection(undefined);
  }

  return (
    <div className="flex h-full flex-col bg-[color:var(--ed-bg-elevated)]">
      <div className="editor-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-active={activeTab === tab.id}
            onClick={() => onNavChange(tab.id)}
            className="editor-panel-tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {activeTab === "pages" ? (
          <>
            <p className="editor-panel-label">{dict.editor.pages}</p>
            <ul className="space-y-0.5 px-1">
              {EDITOR_PAGES.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => onPageChange(page.id)}
                    className={cn(
                      "flex w-full items-center rounded-[var(--ed-radius)] px-2.5 py-1.5 text-start text-[12.5px] transition",
                      activePage === page.id
                        ? "bg-[color:var(--ed-bg-active)] text-[color:var(--ed-fg)]"
                        : "text-[color:var(--ed-muted)] hover:bg-[color:var(--ed-bg-hover)] hover:text-[color:var(--ed-fg)]",
                    )}
                  >
                    {page.label[locale]}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-2">
            <div className="px-1">
              <button
                type="button"
                onClick={onAddSection}
                className="editor-add-section"
              >
                <Plus size={14} />
                {dict.editor.addSection}
              </button>
            </div>

            {config.sections.length > 0 ? (
              <>
                <p className="editor-panel-label">{dict.editor.sections}</p>
                <label className="editor-search-field mx-1">
                  <Search size={13} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={dict.editor.searchSections}
                    className="min-w-0 flex-1 bg-transparent text-[12px] text-[color:var(--ed-fg)] outline-none placeholder:text-[color:var(--ed-subtle)]"
                  />
                </label>
              </>
            ) : null}

            {config.sections.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-[13px] text-[color:var(--ed-fg)]">
                  {dict.editor.emptySections}
                </p>
                <button
                  type="button"
                  onClick={onAddSection}
                  className="mt-3 text-[12px] text-[color:var(--ed-select)] hover:underline"
                >
                  {dict.editor.addSection}
                </button>
              </div>
            ) : filteredSections.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-[color:var(--ed-muted)]">
                {dict.editor.noSectionsMatch}
              </p>
            ) : (
              <ul className="space-y-0.5 px-0.5">
                {filteredSections.map((section) => {
                  const index = config.sections.findIndex(
                    (s) => s.id === section.id,
                  );
                  const blocks = SECTION_LAYER_BLOCKS[section.type] ?? [];
                  const open =
                    expanded[section.id] ??
                    selectedSectionId === section.id;
                  const selected = selectedSectionId === section.id;

                  return (
                    <li key={section.id} className="space-y-0.5">
                      <div
                        draggable
                        data-selected={selected && !selectedField}
                        data-dragging={dragIndex === index}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (dragIndex == null) return;
                          reorder(dragIndex, index);
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className="editor-layer-row group relative"
                      >
                        <span className="inline-flex size-6 cursor-grab items-center justify-center text-[color:var(--ed-subtle)] active:cursor-grabbing">
                          <GripVertical size={12} />
                        </span>
                        {blocks.length ? (
                          <button
                            type="button"
                            className="inline-flex size-6 items-center justify-center text-[color:var(--ed-subtle)]"
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [section.id]: !open,
                              }))
                            }
                            aria-label={open ? "Collapse" : "Expand"}
                          >
                            {open ? (
                              <ChevronDown size={13} />
                            ) : (
                              <ChevronRight size={13} />
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate py-1.5 text-start text-[12.5px] text-[color:var(--ed-fg)]"
                          onClick={() => onSelectSection(section.id)}
                        >
                          <span
                            className={cn(
                              "inline-flex max-w-full items-center gap-1.5",
                              !section.visible &&
                                "text-[color:var(--ed-subtle)] line-through",
                            )}
                          >
                            {(() => {
                              const Icon = sectionTypeIcon(section.type);
                              return (
                                <Icon
                                  size={12}
                                  className="shrink-0 text-[color:var(--ed-subtle)]"
                                />
                              );
                            })()}
                            <span className="truncate">
                              {sectionLabel(
                                section.type as WebsiteSectionType,
                                locale,
                              )}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-7 items-center justify-center rounded-md text-[color:var(--ed-subtle)] opacity-0 transition hover:bg-white/[0.06] hover:text-[color:var(--ed-fg)] group-hover:opacity-100"
                          onClick={() => {
                            const sections = [...config.sections];
                            sections[index] = {
                              ...section,
                              visible: !section.visible,
                            };
                            onChange({ ...config, sections });
                          }}
                          aria-label={
                            section.visible
                              ? dict.editor.sectionVisible
                              : dict.editor.sectionHidden
                          }
                        >
                          {section.visible ? (
                            <Eye size={13} />
                          ) : (
                            <EyeOff size={13} />
                          )}
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-md text-[color:var(--ed-subtle)] opacity-0 transition hover:bg-white/[0.06] hover:text-[color:var(--ed-fg)] group-hover:opacity-100"
                            onClick={() =>
                              setMenuId((id) =>
                                id === section.id ? null : section.id,
                              )
                            }
                            aria-label="More"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                          {menuId === section.id ? (
                            <div className="editor-more-menu">
                              <MenuItem
                                icon={<Copy size={13} />}
                                label={dict.editor.duplicate}
                                onClick={() => {
                                  duplicateSection(section.id);
                                  setMenuId(null);
                                }}
                              />
                              <MenuItem
                                icon={<Trash2 size={13} />}
                                label={dict.editor.delete}
                                danger
                                onClick={() => {
                                  deleteSection(section.id);
                                  setMenuId(null);
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {open && blocks.length ? (
                        <ul className="ms-8 space-y-0.5 border-s border-white/[0.06] ps-2">
                          {blocks.map((block) => {
                            const active =
                              block.field != null &&
                              selectedField === block.field &&
                              selectedSectionId === section.id;
                            return (
                              <li key={block.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectSection(section.id);
                                    if (block.field) {
                                      onSelectField(block.field, section.id);
                                    }
                                  }}
                                  className={cn(
                                    "w-full rounded-md px-2 py-1 text-start text-[11.5px] transition",
                                    active
                                      ? "bg-[color:var(--ed-select-soft)] text-[color:var(--ed-fg)]"
                                      : "text-[color:var(--ed-muted)] hover:bg-white/[0.04] hover:text-[color:var(--ed-fg)]",
                                  )}
                                >
                                  {block.label[locale]}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-danger={danger || undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition",
        danger
          ? "text-red-300 hover:bg-red-500/10"
          : "text-[color:var(--ed-muted)] hover:bg-white/[0.06] hover:text-[color:var(--ed-fg)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
