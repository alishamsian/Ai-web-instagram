"use client";

/**
 * Product navigator — reflects GrapesJS component tree (not a second layer model).
 * Supports drag reorder + keyboard move up/down.
 */

import { useCallback, useEffect, useState } from "react";
import type { Component, Editor } from "grapesjs";
import {
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
} from "lucide-react";
import {
  canMoveInto,
  moveComponentRelative,
  placeRelativeTo,
} from "@/lib/visual-editor/dnd/reorder";
import {
  blockIdFromAttrs,
  canNestBlocks,
  normalizeBlockId,
} from "@/lib/visual-editor/dnd/nesting";
import { duplicateComponentSafe } from "@/lib/visual-editor/duplicate";
import {
  isComponentLocked,
  toggleComponentLocked,
} from "@/lib/visual-editor/lock";
import { formatComponentLabel } from "@/lib/visual-editor/ux-labels";

type NavNode = {
  id: string;
  label: string;
  component: Component;
  children: NavNode[];
};

type DragPayload = {
  sourceId: string;
};

function labelFor(cmp: Component, isFa: boolean): string {
  const attrs = (cmp.getAttributes?.() ?? {}) as Record<string, string>;
  let textPreview = "";
  try {
    const raw = String(cmp.get("content") || "").trim();
    if (raw && raw.length < 28) textPreview = raw;
  } catch {
    // ignore
  }
  return formatComponentLabel(attrs, {
    locale: isFa ? "fa" : "en",
    tagName: String(cmp.get("tagName") || ""),
    textPreview,
  });
}

function buildTree(cmp: Component, isFa: boolean, depth = 0): NavNode[] {
  if (depth > 12) return [];
  const kids = cmp.components?.();
  const models = Array.isArray(kids)
    ? kids
    : ((kids as { models?: Component[] } | undefined)?.models ?? []);
  const out: NavNode[] = [];
  for (const child of models) {
    if (!child || typeof child.getId !== "function") continue;
    const type = String(child.get("type") || "");
    if (type === "textnode") continue;
    out.push({
      id: child.getId(),
      label: labelFor(child, isFa),
      component: child,
      children: buildTree(child, isFa, depth + 1),
    });
  }
  return out;
}

function findNode(nodes: NavNode[], id: string): NavNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const child = findNode(n.children, id);
    if (child) return child;
  }
  return null;
}

export function VisualNavigator({
  editor,
  isFa,
  onChange,
}: {
  editor: Editor | null;
  isFa: boolean;
  onChange: () => void;
}) {
  const [tree, setTree] = useState<NavNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const [dropPos, setDropPos] = useState<"before" | "after" | "inside" | null>(
    null,
  );

  const refresh = useCallback(() => {
    if (!editor) {
      setTree([]);
      return;
    }
    const wrapper = editor.getWrapper();
    setTree(wrapper ? buildTree(wrapper, isFa) : []);
    const sel = editor.getSelected();
    const sid = sel && !sel.is("wrapper") ? sel.getId() : null;
    setSelectedId(sid);
    if (sid) {
      // Auto-expand ancestors of the selection
      setOpen((prev) => {
        const next = { ...prev };
        let walk: Component | undefined = sel ?? undefined;
        while (walk && !walk.is("wrapper")) {
          next[walk.getId()] = true;
          walk = walk.parent?.() ?? undefined;
        }
        return next;
      });
    }
  }, [editor, isFa]);

  useEffect(() => {
    if (!editor) return;
    refresh();
    const events = [
      "component:add",
      "component:remove",
      "component:update",
      "component:selected",
      "component:deselected",
      "page:select",
      "load",
    ] as const;
    for (const ev of events) editor.on(ev, refresh);
    return () => {
      for (const ev of events) editor.off(ev, refresh);
    };
  }, [editor, refresh]);

  if (!editor) {
    return (
      <p className="ve-assets-hint">
        {isFa ? "در حال بارگذاری…" : "Loading…"}
      </p>
    );
  }

  return (
    <div className="ve-navigator" aria-label={isFa ? "ناوبر" : "Navigator"}>
      <div className="ve-pages__header">
        <h3 className="ve-pages__title">{isFa ? "لایه‌ها" : "Navigator"}</h3>
      </div>
      {tree.length === 0 ? (
        <p className="ve-assets-hint">
          {isFa ? "هنوز لایه‌ای نیست." : "No layers yet."}
        </p>
      ) : (
        <ul className="ve-navigator__list" role="tree" aria-label={isFa ? "لایه‌ها" : "Layers"}>
          {tree.map((node) => (
            <NavItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              open={open}
              setOpen={setOpen}
              editor={editor}
              tree={tree}
              onChange={onChange}
              refresh={refresh}
              dropOverId={dropOverId}
              dropPos={dropPos}
              setDropOverId={setDropOverId}
              setDropPos={setDropPos}
              isFa={isFa}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NavItem({
  node,
  depth,
  selectedId,
  open,
  setOpen,
  editor,
  tree,
  onChange,
  refresh,
  dropOverId,
  dropPos,
  setDropOverId,
  setDropPos,
  isFa,
}: {
  node: NavNode;
  depth: number;
  selectedId: string | null;
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editor: Editor;
  tree: NavNode[];
  onChange: () => void;
  refresh: () => void;
  dropOverId: string | null;
  dropPos: "before" | "after" | "inside" | null;
  setDropOverId: (id: string | null) => void;
  setDropPos: (p: "before" | "after" | "inside" | null) => void;
  isFa: boolean;
}) {
  const hasKids = node.children.length > 0;
  const isOpen = open[node.id] ?? depth < 2;
  const active = selectedId === node.id;
  const visible = node.component.getStyle()?.display !== "none";
  const locked = isComponentLocked(node.component);
  const isDropTarget = dropOverId === node.id;

  return (
    <li role="treeitem" aria-selected={active} aria-expanded={hasKids ? isOpen : undefined}>
      <div
        className="ve-navigator__row"
        data-active={active}
        data-locked={locked || undefined}
        data-drop={isDropTarget ? dropPos : undefined}
        style={{ paddingInlineStart: 8 + depth * 12 }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("text/ve-nav-id")) return;
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
          const attrs = node.component.getAttributes?.() ?? {};
          const targetBlock = normalizeBlockId(
            blockIdFromAttrs(attrs as Record<string, string>),
          );
          const sourceId = e.dataTransfer.getData("text/ve-nav-id");
          const sourceNode = sourceId ? findNode(tree, sourceId) : null;
          const sourceBlock = sourceNode
            ? normalizeBlockId(
                blockIdFromAttrs(
                  (sourceNode.component.getAttributes?.() ?? {}) as Record<
                    string,
                    string
                  >,
                ),
              ) || "div"
            : "div";
          const nest = canNestBlocks(targetBlock, sourceBlock);
          let pos: "before" | "after" | "inside" =
            ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside";
          if (pos === "inside" && !nest.accepted) {
            pos = ratio < 0.5 ? "before" : "after";
          }
          setDropOverId(node.id);
          setDropPos(pos);
          e.dataTransfer.dropEffect = "move";
        }}
        onDragLeave={() => {
          if (dropOverId === node.id) {
            setDropOverId(null);
            setDropPos(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const sourceId = e.dataTransfer.getData("text/ve-nav-id");
          setDropOverId(null);
          setDropPos(null);
          if (!sourceId || sourceId === node.id || !dropPos) return;
          const sourceNode = findNode(tree, sourceId);
          if (!sourceNode) return;
          if (dropPos === "inside") {
            const check = canMoveInto(sourceNode.component, node.component);
            if (!check.ok) return;
          }
          const result = placeRelativeTo(
            sourceNode.component,
            node.component,
            dropPos,
          );
          if (result.ok) {
            onChange();
            refresh();
          }
        }}
      >
        <button
          type="button"
          className="ve-pages__icon-btn ve-navigator__grip"
          aria-label={isFa ? "جابه‌جایی" : "Drag to reorder"}
          title={isFa ? "بکشید" : "Drag"}
          draggable={!locked}
          onDragStart={(e) => {
            if (locked) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData("text/ve-nav-id", node.id);
            e.dataTransfer.effectAllowed = "move";
            const payload: DragPayload = { sourceId: node.id };
            e.dataTransfer.setData("application/json", JSON.stringify(payload));
          }}
          onClick={(e) => e.preventDefault()}
          disabled={locked}
        >
          <GripVertical size={12} />
        </button>
        <button
          type="button"
          className="ve-pages__icon-btn"
          aria-label={isOpen ? "Collapse" : "Expand"}
          disabled={!hasKids}
          onClick={() =>
            setOpen((s) => ({ ...s, [node.id]: !isOpen }))
          }
        >
          {hasKids ? (
            isOpen ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span style={{ width: 12 }} />
          )}
        </button>
        <button
          type="button"
          className="ve-navigator__label"
          onClick={() => editor.select(node.component)}
          aria-current={active ? "true" : undefined}
        >
          {node.label}
          {isDropTarget && dropPos ? (
            <span className="ve-navigator__drop-hint" aria-hidden>
              {dropPos === "before"
                ? isFa
                  ? "قبل"
                  : "before"
                : dropPos === "after"
                  ? isFa
                    ? "بعد"
                    : "after"
                  : isFa
                    ? "داخل"
                    : "inside"}
            </span>
          ) : null}
        </button>
        <div className="ve-navigator__actions">
          <button
            type="button"
            className="ve-pages__icon-btn"
            aria-label={isFa ? "بالا" : "Move up"}
            title={isFa ? "بالا" : "Move up"}
            disabled={locked}
            onClick={() => {
              const result = moveComponentRelative(node.component, "up");
              if (result.ok) {
                onChange();
                refresh();
              }
            }}
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            className="ve-pages__icon-btn"
            aria-label={isFa ? "پایین" : "Move down"}
            title={isFa ? "پایین" : "Move down"}
            disabled={locked}
            onClick={() => {
              const result = moveComponentRelative(node.component, "down");
              if (result.ok) {
                onChange();
                refresh();
              }
            }}
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            className="ve-pages__icon-btn"
            aria-label={
              locked
                ? isFa
                  ? "باز کردن قفل"
                  : "Unlock"
                : isFa
                  ? "قفل"
                  : "Lock"
            }
            title={
              locked
                ? isFa
                  ? "باز کردن قفل"
                  : "Unlock"
                : isFa
                  ? "قفل"
                  : "Lock"
            }
            aria-pressed={locked}
            onClick={() => {
              toggleComponentLocked(node.component);
              onChange();
              refresh();
            }}
          >
            {locked ? <Unlock size={12} /> : <Lock size={12} />}
          </button>
          <button
            type="button"
            className="ve-pages__icon-btn"
            aria-label={
              visible
                ? isFa
                  ? "مخفی"
                  : "Hide"
                : isFa
                  ? "نمایش"
                  : "Show"
            }
            title={
              visible
                ? isFa
                  ? "مخفی"
                  : "Hide"
                : isFa
                  ? "نمایش"
                  : "Show"
            }
            disabled={locked}
            onClick={() => {
              node.component.addStyle({
                display: visible ? "none" : "",
              });
              onChange();
              refresh();
            }}
          >
            {visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            type="button"
            className="ve-pages__icon-btn"
            aria-label={isFa ? "کپی" : "Duplicate"}
            title={isFa ? "کپی" : "Duplicate"}
            disabled={locked}
            onClick={() => {
              duplicateComponentSafe(editor, node.component);
              onChange();
              refresh();
            }}
          >
            <Copy size={12} />
          </button>
          <button
            type="button"
            className="ve-pages__icon-btn"
            aria-label={isFa ? "حذف" : "Delete"}
            title={isFa ? "حذف" : "Delete"}
            disabled={locked}
            onClick={() => {
              node.component.remove();
              onChange();
              refresh();
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {hasKids && isOpen ? (
        <ul className="ve-navigator__list" role="group">
          {node.children.map((child) => (
            <NavItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              open={open}
              setOpen={setOpen}
              editor={editor}
              tree={tree}
              onChange={onChange}
              refresh={refresh}
              dropOverId={dropOverId}
              dropPos={dropPos}
              setDropOverId={setDropOverId}
              setDropPos={setDropPos}
              isFa={isFa}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
