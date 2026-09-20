"use client";

/**
 * Visual Editor page manager — create / rename / delete / duplicate / reorder.
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import type { WebsitePage } from "@/types/website";
import {
  hrefForPageSlug,
  isReservedVisualPageId,
  VISUAL_PAGE_HOME,
} from "@/lib/visual-editor";

export type VisualPagesPanelProps = {
  pages: WebsitePage[];
  activePageId: string;
  isFa: boolean;
  onSelect: (pageId: string) => void;
  onCreate: (input: { name: string; slug: string }) => void | Promise<void>;
  onRename: (
    pageId: string,
    patch: { name: string; slug?: string },
  ) => void | Promise<void>;
  onDuplicate: (pageId: string) => void | Promise<void>;
  onDelete: (pageId: string) => void | Promise<void>;
  onMove: (pageId: string, direction: "up" | "down") => void | Promise<void>;
  error?: string | null;
};

export function VisualPagesPanel({
  pages,
  activePageId,
  isFa,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onMove,
  error,
}: VisualPagesPanelProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const ordered = useMemo(() => pages, [pages]);

  function startCreate() {
    setCreating(true);
    setNewName("");
    setNewSlug("");
    setMenuId(null);
  }

  function submitCreate() {
    void onCreate({ name: newName, slug: newSlug });
    setCreating(false);
    setNewName("");
    setNewSlug("");
  }

  function startRename(page: WebsitePage) {
    setEditingId(page.id);
    setEditName(page.name);
    setEditSlug(page.slug);
    setMenuId(null);
  }

  function submitRename() {
    if (!editingId) return;
    const page = pages.find((p) => p.id === editingId);
    void onRename(editingId, {
      name: editName,
      slug: page?.kind === "custom" ? editSlug : undefined,
    });
    setEditingId(null);
  }

  return (
    <div className="ve-pages">
      <div className="ve-pages__header">
        <span className="ve-pages__title">{isFa ? "صفحات" : "Pages"}</span>
        <button
          type="button"
          className="ve-btn ve-pages__add"
          onClick={startCreate}
          title={isFa ? "صفحه جدید" : "New page"}
        >
          <Plus size={14} />
          {isFa ? "جدید" : "New"}
        </button>
      </div>

      {error ? <p className="ve-pages__error">{error}</p> : null}

      {creating ? (
        <div className="ve-pages__form">
          <label className="ve-pages__label">
            {isFa ? "نام" : "Name"}
            <input
              className="ve-pages__input"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newSlug || newSlug === slugifyPreview(newName.slice(0, -1))) {
                  setNewSlug(slugifyPreview(e.target.value));
                }
              }}
              placeholder={isFa ? "خدمات" : "Services"}
              autoFocus
            />
          </label>
          <label className="ve-pages__label">
            {isFa ? "اسلاگ" : "Slug"}
            <input
              className="ve-pages__input"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="services"
              dir="ltr"
            />
          </label>
          <div className="ve-pages__form-actions">
            <button
              type="button"
              className="ve-btn ve-btn--primary"
              onClick={submitCreate}
            >
              {isFa ? "ایجاد" : "Create"}
            </button>
            <button
              type="button"
              className="ve-btn"
              onClick={() => setCreating(false)}
            >
              {isFa ? "لغو" : "Cancel"}
            </button>
          </div>
        </div>
      ) : null}

      <ul className="ve-pages__list" role="list">
        {ordered.map((page, index) => {
          const active = activePageId === page.id;
          const reserved = isReservedVisualPageId(page.id);
          const editing = editingId === page.id;
          return (
            <li key={page.id} className="ve-pages__row">
              {editing ? (
                <div className="ve-pages__form">
                  <input
                    className="ve-pages__input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  {page.kind === "custom" ? (
                    <input
                      className="ve-pages__input"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      dir="ltr"
                    />
                  ) : (
                    <span className="ve-pages__slug" dir="ltr">
                      {hrefForPageSlug(page.slug)}
                    </span>
                  )}
                  <div className="ve-pages__form-actions">
                    <button
                      type="button"
                      className="ve-btn ve-btn--primary"
                      onClick={submitRename}
                    >
                      {isFa ? "ذخیره" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="ve-btn"
                      onClick={() => setEditingId(null)}
                    >
                      {isFa ? "لغو" : "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="ve-page-item"
                    data-active={active}
                    onClick={() => onSelect(page.id)}
                  >
                    <span className="ve-pages__dot" aria-hidden>
                      {active ? "●" : "○"}
                    </span>
                    <span className="ve-pages__meta">
                      <span className="ve-pages__name">
                        {page.name}
                        {reserved ? (
                          <span className="ve-pages__badge">
                            {page.kind === "home"
                              ? isFa
                                ? "خانه"
                                : "Home"
                              : isFa
                                ? "درباره"
                                : "About"}
                          </span>
                        ) : null}
                      </span>
                      <span className="ve-pages__slug" dir="ltr">
                        {hrefForPageSlug(page.slug)}
                      </span>
                    </span>
                  </button>
                  <div className="ve-pages__tools">
                    <button
                      type="button"
                      className="ve-pages__icon-btn"
                      disabled={index <= (pages[0]?.id === VISUAL_PAGE_HOME ? 1 : 0)}
                      title={isFa ? "بالا" : "Move up"}
                      onClick={() => void onMove(page.id, "up")}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="ve-pages__icon-btn"
                      disabled={index >= ordered.length - 1}
                      title={isFa ? "پایین" : "Move down"}
                      onClick={() => void onMove(page.id, "down")}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="ve-pages__icon-btn"
                      aria-expanded={menuId === page.id}
                      onClick={() =>
                        setMenuId((id) => (id === page.id ? null : page.id))
                      }
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuId === page.id ? (
                      <div className="ve-pages__menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => startRename(page)}
                        >
                          {isFa ? "تغییر نام" : "Rename"}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuId(null);
                            void onDuplicate(page.id);
                          }}
                        >
                          <Copy size={12} />
                          {isFa ? "تکثیر" : "Duplicate"}
                        </button>
                        {page.id !== VISUAL_PAGE_HOME ? (
                          <button
                            type="button"
                            role="menuitem"
                            className="ve-pages__danger"
                            onClick={() => {
                              setMenuId(null);
                              const ok = window.confirm(
                                isFa
                                  ? `صفحه «${page.name}» حذف شود؟`
                                  : `Delete page “${page.name}”?`,
                              );
                              if (ok) void onDelete(page.id);
                            }}
                          >
                            <Trash2 size={12} />
                            {isFa ? "حذف" : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function slugifyPreview(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/-]/g, "")
    .replace(/-+/g, "-");
}
