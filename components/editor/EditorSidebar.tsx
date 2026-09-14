"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import { sectionLabel } from "@/components/editor/editor-utils";
import { SECTION_LAYER_BLOCKS } from "@/components/editor/editor-selection";
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

  const tabs: { id: LeftNavTab; label: string }[] = [
    { id: "pages", label: dict.editor.pages },
    { id: "sections", label: dict.editor.sections },
    { id: "layers", label: dict.editor.layers },
  ];

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
            data-active={nav === tab.id}
            onClick={() => onNavChange(tab.id)}
            className="editor-panel-tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {nav === "pages" ? (
          <ul className="space-y-0.5">
            {EDITOR_PAGES.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onPageChange(page.id)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2.5 py-2 text-start text-[12.5px] transition",
                    activePage === page.id
                      ? "bg-white/[0.08] text-[color:var(--ed-fg)]"
                      : "text-[color:var(--ed-muted)] hover:bg-white/[0.04] hover:text-[color:var(--ed-fg)]",
                  )}
                >
                  {page.label[locale]}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {nav === "sections" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onAddSection}
              className="editor-add-section"
            >
              <Plus size={14} />
              {dict.editor.addSection}
            </button>

            {config.sections.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] px-3 py-8 text-center">
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
            ) : (
              <ul className="space-y-0.5">
                {config.sections.map((section, index) => (
                  <li
                    key={section.id}
                    draggable
                    data-selected={selectedSectionId === section.id}
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
                    <span className="inline-flex size-7 cursor-grab items-center justify-center text-[color:var(--ed-subtle)] active:cursor-grabbing">
                      <GripVertical size={13} />
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate py-1.5 text-start text-[12.5px] text-[color:var(--ed-fg)]"
                      onClick={() => onSelectSection(section.id)}
                    >
                      <span
                        className={cn(
                          !section.visible &&
                            "text-[color:var(--ed-subtle)] line-through",
                        )}
                      >
                        {sectionLabel(
                          section.type as WebsiteSectionType,
                          locale,
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-md text-[color:var(--ed-subtle)] opacity-70 transition hover:bg-white/[0.06] hover:text-[color:var(--ed-fg)] group-hover:opacity-100"
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
                        className="inline-flex size-8 items-center justify-center rounded-md text-[color:var(--ed-subtle)] opacity-70 transition hover:bg-white/[0.06] hover:text-[color:var(--ed-fg)] group-hover:opacity-100"
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
                        <div className="absolute end-0 top-9 z-30 min-w-[148px] rounded-xl border border-white/10 bg-[#16161a] p-1 shadow-2xl">
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {nav === "layers" ? (
          <LayersTree
            config={config}
            locale={locale}
            selectedSectionId={selectedSectionId}
            selectedField={selectedField}
            expanded={expanded}
            onToggle={(id) =>
              setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
            }
            onSelectSection={onSelectSection}
            onSelectField={onSelectField}
          />
        ) : null}
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
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition",
        danger
          ? "text-red-300 hover:bg-red-500/10"
          : "text-[#B5B5BC] hover:bg-white/[0.06] hover:text-[#F7F7F8]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function LayersTree({
  config,
  locale,
  selectedSectionId,
  selectedField,
  expanded,
  onToggle,
  onSelectSection,
  onSelectField,
}: {
  config: WebsiteConfig;
  locale: Locale;
  selectedSectionId?: string;
  selectedField?: EditorFieldPath;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelectSection: (id: string) => void;
  onSelectField: (path: EditorFieldPath, sectionId: string) => void;
}) {
  const rows = useMemo(() => config.sections, [config.sections]);

  return (
    <ul className="space-y-0.5">
      {rows.map((section) => {
        const open =
          expanded[section.id] ??
          (selectedSectionId === section.id ||
            Boolean(
              selectedField &&
                SECTION_LAYER_BLOCKS[section.type]?.some(
                  (block) => block.field === selectedField,
                ),
            ));
        const blocks = SECTION_LAYER_BLOCKS[section.type] ?? [];
        return (
          <li key={section.id}>
            <div
              className={cn(
                "editor-layer-row",
                selectedSectionId === section.id &&
                  !selectedField &&
                  "bg-[color:var(--ed-select-soft)]",
              )}
              data-selected={
                selectedSectionId === section.id && !selectedField
              }
            >
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center text-[#77777F]"
                onClick={() => onToggle(section.id)}
                aria-label={open ? "Collapse" : "Expand"}
              >
                {blocks.length ? (
                  open ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )
                ) : (
                  <span className="size-3" />
                )}
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-start text-[13px] text-[#F7F7F8]"
                onClick={() => onSelectSection(section.id)}
              >
                {sectionLabel(section.type as WebsiteSectionType, locale)}
              </button>
            </div>
            {open && blocks.length ? (
              <ul className="ms-6 space-y-0.5 border-s border-white/[0.06] ps-2">
                {blocks.map((block) => {
                  const active =
                    block.field != null && selectedField === block.field;
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
                          "w-full rounded px-2 py-1 text-start text-[12px] transition",
                          active
                            ? "bg-[#FF6B57]/15 text-[#F7F7F8]"
                            : "text-[#77777F] hover:bg-white/[0.04] hover:text-[#B5B5BC]",
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
  );
}
