"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import { sectionLabel } from "@/components/editor/editor-utils";
import { SECTION_LAYER_BLOCKS } from "@/components/editor/editor-selection";
import { sectionTypeIcon } from "@/components/editor/section-icons";
import {
  commandDeleteSection,
  commandDuplicateSection,
  commandMoveSection,
  commandReorderSections,
  commandToggleSection,
} from "@/lib/editor/commands";
import {
  buildLayerTreeItems,
  resolveLayerTreeKeyCommand,
} from "@/lib/editor/layer-tree";
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

export function EditorLayersPanel({
  config,
  dict,
  locale,
  selectedSectionId,
  selectedField,
  hoveredSectionId,
  onSelectSection,
  onSelectField,
  onHoverSection,
  onChange,
  onAddSection,
  compactChrome = false,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  selectedSectionId?: string;
  selectedField?: EditorFieldPath;
  hoveredSectionId?: string;
  onSelectSection: (id: string | undefined) => void;
  onSelectField: (path: EditorFieldPath, sectionId: string) => void;
  onHoverSection?: (id: string | undefined) => void;
  onChange: (next: WebsiteConfig) => void;
  onAddSection: () => void;
  /** When true, hide redundant add CTA (provided by left panel header). */
  compactChrome?: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const treeRef = useRef<HTMLUListElement>(null);

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

  const treeItems = useMemo(
    () =>
      buildLayerTreeItems({
        sections: filteredSections,
        expanded,
        selectedSectionId,
      }),
    [filteredSections, expanded, selectedSectionId],
  );

  useEffect(() => {
    if (!selectedSectionId) return;
    setExpanded((prev) =>
      prev[selectedSectionId] === true
        ? prev
        : { ...prev, [selectedSectionId]: true },
    );

    if (!selectedField) {
      setFocusId((prev) =>
        prev === `section:${selectedSectionId}`
          ? prev
          : `section:${selectedSectionId}`,
      );
      return;
    }

    const section = config.sections.find((entry) => entry.id === selectedSectionId);
    const block = section
      ? (SECTION_LAYER_BLOCKS[section.type] ?? []).find(
          (entry) => entry.field === selectedField,
        )
      : undefined;
    const nextFocus = block
      ? `block:${selectedSectionId}:${block.id}`
      : `section:${selectedSectionId}`;
    setFocusId((prev) => (prev === nextFocus ? prev : nextFocus));
  }, [selectedSectionId, selectedField, config.sections]);

  function reorder(from: number, to: number) {
    const result = commandReorderSections(config, from, to);
    if (!result) return;
    onChange(result.config);
  }

  function duplicateSection(sectionId: string) {
    const result = commandDuplicateSection(config, sectionId);
    if (!result) return;
    onChange(result.config);
    if (result.selectedSectionId) onSelectSection(result.selectedSectionId);
  }

  function deleteSection(sectionId: string) {
    const result = commandDeleteSection(config, sectionId);
    if (!result) return;
    onChange(result.config);
    if (result.selectedSectionId !== undefined) {
      onSelectSection(result.selectedSectionId ?? undefined);
    }
  }

  function toggleSection(sectionId: string) {
    const result = commandToggleSection(config, sectionId);
    if (!result) return;
    onChange(result.config);
  }

  function move(sectionId: string, direction: "up" | "down") {
    const result = commandMoveSection(config, sectionId, direction);
    if (!result) return;
    onChange(result.config);
  }

  function activateItem(itemId: string) {
    const item = treeItems.find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.kind === "section") {
      onSelectSection(item.sectionId);
      return;
    }
    onSelectSection(item.sectionId);
    if (item.field) onSelectField(item.field, item.sectionId);
  }

  function onTreeKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    if (!treeItems.length) return;
    const currentIndex = Math.max(
      0,
      treeItems.findIndex((item) => item.id === focusId),
    );
    const current = treeItems[currentIndex];
    if (!current) return;
    const expandable =
      current.kind === "section" && current.expandable;
    const isExpanded =
      current.kind === "section"
        ? expanded[current.sectionId] ?? selectedSectionId === current.sectionId
        : false;
    const command = resolveLayerTreeKeyCommand(event.key, {
      index: currentIndex,
      itemCount: treeItems.length,
      expandable,
      expanded: isExpanded,
    });
    if (!command) return;
    event.preventDefault();
    if (command.type === "escape") {
      setFocusId(null);
      onSelectSection(undefined);
      return;
    }
    if (command.type === "expand" && current.kind === "section") {
      setExpanded((prev) => ({ ...prev, [current.sectionId]: true }));
      return;
    }
    if (command.type === "collapse" && current.kind === "section") {
      setExpanded((prev) => ({ ...prev, [current.sectionId]: false }));
      return;
    }
    if (command.type === "activate") {
      activateItem(current.id);
      return;
    }
    if (command.type === "move") {
      const next = treeItems[command.index];
      if (!next) return;
      setFocusId(next.id);
      const node = treeRef.current?.querySelector(
        `[data-tree-id="${CSS.escape(next.id)}"]`,
      ) as HTMLElement | null;
      node?.focus();
    }
  }

  return (
    <div className={cn("editor-layers-panel", compactChrome && "editor-layers-panel--compact")}>
      {!compactChrome ? (
        <div className="px-0.5">
          <button type="button" onClick={onAddSection} className="editor-add-section">
            <Plus size={14} />
            {dict.editor.addSection}
          </button>
        </div>
      ) : null}

      {config.sections.length > 0 ? (
        <label className="editor-search-field mx-0.5">
          <Search size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.editor.searchSections}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[color:var(--ed-fg)] outline-none placeholder:text-[color:var(--ed-subtle)]"
          />
        </label>
      ) : null}

      {config.sections.length === 0 ? (
        <div className="px-3 py-10 text-center">
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
        <ul
          ref={treeRef}
          className="space-y-0.5"
          role="tree"
          aria-label={dict.editor.layers}
          onKeyDown={onTreeKeyDown}
        >
          {filteredSections.map((section) => {
            const index = config.sections.findIndex((s) => s.id === section.id);
            const blocks = SECTION_LAYER_BLOCKS[section.type] ?? [];
            const open =
              expanded[section.id] ?? selectedSectionId === section.id;
            const selected = selectedSectionId === section.id;
            const hovered =
              hoveredSectionId === section.id && !selected;
            const Icon = sectionTypeIcon(section.type);
            const sectionTreeId = `section:${section.id}`;

            return (
              <li
                key={section.id}
                role="treeitem"
                aria-selected={selected && !selectedField}
                aria-expanded={blocks.length ? open : undefined}
              >
                <div
                  draggable
                  tabIndex={0}
                  data-tree-id={sectionTreeId}
                  data-selected={selected && !selectedField}
                  data-hovered={hovered || undefined}
                  data-hidden={!section.visible || undefined}
                  data-focused={focusId === sectionTreeId || undefined}
                  data-dragging={dragIndex === index}
                  data-drop-target={dropIndex === index || undefined}
                  onMouseEnter={() => onHoverSection?.(section.id)}
                  onMouseLeave={() => onHoverSection?.(undefined)}
                  onFocus={() => setFocusId(sectionTreeId)}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropIndex(index);
                  }}
                  onDrop={() => {
                    if (dragIndex == null) return;
                    reorder(dragIndex, index);
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDropIndex(null);
                  }}
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
                  ) : (
                    <span className="size-6" aria-hidden />
                  )}
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate py-1.5 text-start text-[12.5px] text-[color:var(--ed-fg)]"
                    onClick={() => onSelectSection(section.id)}
                  >
                    <span className="inline-flex max-w-full items-center gap-1.5">
                      <Icon
                        size={12}
                        className="shrink-0 text-[color:var(--ed-subtle)]"
                      />
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
                    className="editor-layer-action"
                    onClick={() => toggleSection(section.id)}
                    aria-label={
                      section.visible
                        ? dict.editor.sectionVisible
                        : dict.editor.sectionHidden
                    }
                    title={
                      section.visible
                        ? dict.editor.sectionVisible
                        : dict.editor.sectionHidden
                    }
                  >
                    {section.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      className="editor-layer-action"
                      onClick={() =>
                        setMenuId((id) =>
                          id === section.id ? null : section.id,
                        )
                      }
                      aria-label="More"
                      aria-expanded={menuId === section.id}
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {menuId === section.id ? (
                      <div className="editor-more-menu" role="menu">
                        {section.type !== "footer" ? (
                          <>
                            <MenuItem
                              icon={<Copy size={13} />}
                              label={dict.editor.duplicate}
                              onClick={() => {
                                duplicateSection(section.id);
                                setMenuId(null);
                              }}
                            />
                            <MenuItem
                              icon={
                                <ChevronDown
                                  size={13}
                                  className="rotate-180"
                                />
                              }
                              label={dict.editor.moveUp}
                              onClick={() => {
                                move(section.id, "up");
                                setMenuId(null);
                              }}
                            />
                            <MenuItem
                              icon={<ChevronDown size={13} />}
                              label={dict.editor.moveDown}
                              onClick={() => {
                                move(section.id, "down");
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
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {open && blocks.length ? (
                  <ul
                    className="ms-8 space-y-0.5 border-s border-white/[0.06] ps-2"
                    role="group"
                  >
                    {blocks.map((block) => {
                      const active =
                        block.field != null &&
                        selectedField === block.field &&
                        selectedSectionId === section.id;
                      const blockId = `block:${section.id}:${block.id}`;
                      return (
                        <li
                          key={block.id}
                          role="treeitem"
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            tabIndex={0}
                            data-tree-id={blockId}
                            data-focused={focusId === blockId || undefined}
                            onFocus={() => setFocusId(blockId)}
                            onMouseEnter={() => onHoverSection?.(section.id)}
                            onMouseLeave={() => onHoverSection?.(undefined)}
                            onClick={() => {
                              onSelectSection(section.id);
                              if (block.field) {
                                onSelectField(block.field, section.id);
                              }
                            }}
                            className={cn(
                              "editor-layer-child w-full rounded-md px-2 py-1 text-start text-[11.5px] transition",
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
