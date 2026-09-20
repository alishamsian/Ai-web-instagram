"use client";

/**
 * Product navigator — reflects GrapesJS component tree (not a second layer model).
 */

import { useCallback, useEffect, useState } from "react";
import type { Component, Editor } from "grapesjs";
import {
  Copy,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

type NavNode = {
  id: string;
  label: string;
  component: Component;
  children: NavNode[];
};

function labelFor(cmp: Component): string {
  const attrs = cmp.getAttributes?.() ?? {};
  if (attrs["data-section-type"]) return String(attrs["data-section-type"]);
  if (attrs["data-component-type"]) return String(attrs["data-component-type"]);
  const tag = String(cmp.get("tagName") || cmp.get("type") || "node");
  const text = String(cmp.get("content") || "").trim();
  if (text && text.length < 28) return `${tag}: ${text}`;
  return tag;
}

function buildTree(cmp: Component, depth = 0): NavNode[] {
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
      label: labelFor(child),
      component: child,
      children: buildTree(child, depth + 1),
    });
  }
  return out;
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

  const refresh = useCallback(() => {
    if (!editor) {
      setTree([]);
      return;
    }
    const wrapper = editor.getWrapper();
    setTree(wrapper ? buildTree(wrapper) : []);
    const sel = editor.getSelected();
    setSelectedId(sel && !sel.is("wrapper") ? sel.getId() : null);
  }, [editor]);

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
        <ul className="ve-navigator__list">
          {tree.map((node) => (
            <NavItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              open={open}
              setOpen={setOpen}
              editor={editor}
              onChange={onChange}
              refresh={refresh}
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
  onChange,
  refresh,
}: {
  node: NavNode;
  depth: number;
  selectedId: string | null;
  open: Record<string, boolean>;
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  editor: Editor;
  onChange: () => void;
  refresh: () => void;
}) {
  const hasKids = node.children.length > 0;
  const isOpen = open[node.id] ?? depth < 2;
  const active = selectedId === node.id;
  const visible = node.component.getStyle()?.display !== "none";

  return (
    <li>
      <div
        className="ve-navigator__row"
        data-active={active}
        style={{ paddingInlineStart: 8 + depth * 12 }}
      >
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
        >
          {node.label}
        </button>
        <button
          type="button"
          className="ve-pages__icon-btn"
          aria-label={visible ? "Hide" : "Show"}
          title={visible ? "Hide" : "Show"}
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
          aria-label="Duplicate"
          title="Duplicate"
          onClick={() => {
            const parent = node.component.parent();
            if (!parent) return;
            const idx = node.component.index();
            const clone = node.component.clone();
            parent.append(clone, { at: idx + 1 });
            onChange();
            refresh();
          }}
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          className="ve-pages__icon-btn"
          aria-label="Delete"
          title="Delete"
          onClick={() => {
            node.component.remove();
            onChange();
            refresh();
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      {hasKids && isOpen ? (
        <ul className="ve-navigator__list">
          {node.children.map((child) => (
            <NavItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              open={open}
              setOpen={setOpen}
              editor={editor}
              onChange={onChange}
              refresh={refresh}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
