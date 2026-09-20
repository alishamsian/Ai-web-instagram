"use client";

/**
 * Product-owned block library — search, tabs, click-to-insert.
 * GrapesJS BlockManager remains available for drag via registered blocks.
 */

import { useMemo, useState } from "react";
import {
  listVisualBlocks,
  type VisualBlockDefinition,
  type VisualLibraryTab,
} from "@/lib/visual-editor/registry";
import { setActiveLibraryDrag } from "@/lib/visual-editor/dnd/drag-state";

const TABS: Array<{ id: VisualLibraryTab; fa: string; en: string }> = [
  { id: "sections", fa: "سکشن‌ها", en: "Sections" },
  { id: "layout", fa: "چیدمان", en: "Layout" },
  { id: "components", fa: "پایه", en: "Basic" },
  { id: "media", fa: "رسانه", en: "Media" },
  { id: "forms", fa: "فرم‌ها", en: "Forms" },
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
  const [expanded, setExpanded] = useState<string | null>(null);

  const blocks = useMemo(
    () => listVisualBlocks({ tab, query }),
    [tab, query],
  );

  return (
    <div className="ve-library">
      <label className="ve-library__search">
        <span className="sr-only">{isFa ? "جستجوی بلوک" : "Search blocks"}</span>
        <input
          type="search"
          className="ve-pages__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isFa ? "جستجوی بلوک…" : "Search blocks…"}
          aria-label={isFa ? "جستجوی بلوک" : "Search blocks"}
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
        {blocks.map((block) => (
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
        {blocks.length === 0 ? (
          <p className="ve-assets-hint" role="status">
            {isFa ? "بلوکی پیدا نشد." : "No blocks match your search."}
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
