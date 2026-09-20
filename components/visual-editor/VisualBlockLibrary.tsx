"use client";

/**
 * Product-owned block library — search, tabs, grouped insert, drag-to-canvas.
 */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { VisualLibraryTab } from "@/lib/visual-editor/registry";
import { setActiveLibraryDrag } from "@/lib/visual-editor/dnd/drag-state";
import { groupLibraryBlocks } from "@/lib/visual-editor/ux-library";
import type { VisualBlockDefinition } from "@/lib/visual-editor/registry/types";

const TABS: Array<{ id: VisualLibraryTab; fa: string; en: string }> = [
  { id: "sections", fa: "سکشن‌ها", en: "Sections" },
  { id: "layout", fa: "چیدمان", en: "Layout" },
  { id: "components", fa: "پایه", en: "Basic" },
  { id: "media", fa: "رسانه", en: "Media" },
  { id: "forms", fa: "فرم‌ها", en: "Forms" },
  { id: "navigation", fa: "ناوبری", en: "Navigation" },
];

export function VisualBlockLibrary({
  isFa,
  onInsert,
}: {
  isFa: boolean;
  onInsert: (blockId: string, variantId?: string) => void;
}) {
  const [tab, setTab] = useState<VisualLibraryTab>("sections");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Registry is client-populated; defer list render until after mount to avoid
  // SSR/client block-count hydration mismatches.
  useEffect(() => {
    setMounted(true);
  }, []);

  const groups = useMemo(
    () =>
      mounted ? groupLibraryBlocks({ tab, query: deferredQuery }) : [],
    [tab, deferredQuery, mounted],
  );

  const total = groups.reduce((n, g) => n + g.blocks.length, 0);

  return (
    <div className="ve-library">
      <label className="ve-library__search">
        <span className="sr-only">
          {isFa ? "جستجوی کامپوننت" : "Search components"}
        </span>
        <input
          type="search"
          className="ve-pages__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isFa ? "جستجوی کامپوننت…" : "Search components…"
          }
          aria-label={isFa ? "جستجوی کامپوننت" : "Search components"}
          autoComplete="off"
        />
      </label>

      <div className="ve-library__tabs" role="tablist" aria-label="Library">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="ve-tab"
            data-active={tab === t.id}
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setExpanded(null);
            }}
          >
            {isFa ? t.fa : t.en}
          </button>
        ))}
      </div>

      <div className="ve-library__grid" role="list">
        {!mounted ? (
          <p className="ve-muted" style={{ padding: "8px 4px", margin: 0 }}>
            {isFa ? "در حال بارگذاری…" : "Loading…"}
          </p>
        ) : null}
        {groups.map((group) => (
          <div key={group.id} className="ve-library__group" role="group">
            <h4 className="ve-library__group-title">
              {isFa ? group.label.fa : group.label.en}
            </h4>
            {group.blocks.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                isFa={isFa}
                expanded={expanded === block.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === block.id ? null : block.id))
                }
                onInsert={onInsert}
              />
            ))}
          </div>
        ))}
        {mounted && total === 0 ? (
          <p className="ve-assets-hint" role="status">
            {isFa ? "کامپوننتی پیدا نشد." : "No components match your search."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BlockCard({
  block,
  isFa,
  expanded,
  onToggle,
  onInsert,
}: {
  block: VisualBlockDefinition;
  isFa: boolean;
  expanded: boolean;
  onToggle: () => void;
  onInsert: (blockId: string, variantId?: string) => void;
}) {
  const label = isFa ? block.label.fa : block.label.en;
  const desc = isFa ? block.description?.fa : block.description?.en;
  const variants = block.variants ?? [];

  return (
    <div className="ve-library__card" role="listitem">
      <button
        type="button"
        className="ve-library__card-main"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/ve-block-id", block.id);
          e.dataTransfer.effectAllowed = "copy";
          setActiveLibraryDrag(block.id);
        }}
        onDragEnd={() => {
          setActiveLibraryDrag(null);
        }}
        onClick={() => {
          if (variants.length > 1) onToggle();
          else onInsert(block.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (variants.length > 1) onToggle();
            else onInsert(block.id);
          }
        }}
        aria-label={isFa ? `افزودن ${label}` : `Insert ${label}`}
        title={desc || label}
      >
        <span className="ve-library__card-title">{label}</span>
        {variants.length > 0 ? (
          <span className="ve-library__card-meta">
            {variants.length} {isFa ? "واریانت" : "variants"}
          </span>
        ) : null}
      </button>
      {expanded && variants.length > 0 ? (
        <div className="ve-library__variants" role="group">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              className="ve-btn"
              style={{ width: "100%", justifyContent: "flex-start" }}
              onClick={() => onInsert(block.id, v.id)}
            >
              {isFa ? v.label.fa : v.label.en}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
