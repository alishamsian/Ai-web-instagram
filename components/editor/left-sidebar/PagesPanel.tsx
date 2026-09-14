"use client";

import { useMemo, useState } from "react";
import {
  CircleHelp,
  Contact,
  Home,
  Info,
  ShoppingBag,
  Store,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import { SidebarSearch } from "@/components/editor/left-sidebar/SidebarSearch";

const EDITOR_VIEWS = [
  {
    id: "home",
    group: "main" as const,
    label: { fa: "خانه", en: "Home" },
    Icon: Home,
  },
  {
    id: "shop",
    group: "store" as const,
    label: { fa: "فروشگاه", en: "Shop" },
    Icon: Store,
  },
  {
    id: "product",
    group: "store" as const,
    label: { fa: "محصول", en: "Product" },
    Icon: ShoppingBag,
  },
  {
    id: "about",
    group: "info" as const,
    label: { fa: "درباره", en: "About" },
    Icon: Info,
  },
  {
    id: "contact",
    group: "info" as const,
    label: { fa: "تماس", en: "Contact" },
    Icon: Contact,
  },
  {
    id: "faq",
    group: "info" as const,
    label: { fa: "پرسش‌ها", en: "FAQ" },
    Icon: CircleHelp,
  },
] as const;

export function PagesPanel({
  dict,
  locale,
  activePage,
  onPageChange,
}: {
  dict: Dictionary;
  locale: Locale;
  activePage: string;
  onPageChange: (pageId: string) => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () => [
      {
        id: "main",
        title: dict.editor.viewsGroupMain,
        items: EDITOR_VIEWS.filter((v) => v.group === "main"),
      },
      {
        id: "store",
        title: dict.editor.viewsGroupStore,
        items: EDITOR_VIEWS.filter((v) => v.group === "store"),
      },
      {
        id: "info",
        title: dict.editor.viewsGroupInfo,
        items: EDITOR_VIEWS.filter((v) => v.group === "info"),
      },
    ],
    [dict.editor.viewsGroupInfo, dict.editor.viewsGroupMain, dict.editor.viewsGroupStore],
  );

  const showSearch = EDITOR_VIEWS.length > 5;

  return (
    <div className="editor-left-panel-body">
      {showSearch ? (
        <SidebarSearch
          value={query}
          onChange={setQuery}
          placeholder={dict.editor.searchPages}
          label={dict.editor.searchPages}
        />
      ) : null}

      <nav aria-label={dict.editor.pages} className="editor-pages-nav">
        {groups.map((group) => {
          const items = group.items.filter((item) => {
            const q = query.trim().toLowerCase();
            if (!q) return true;
            return item.label[locale].toLowerCase().includes(q);
          });
          if (!items.length) return null;
          return (
            <div key={group.id} className="editor-pages-group">
              <p className="editor-left-group-label">{group.title}</p>
              <ul className="editor-left-row-list" role="list">
                {items.map((page) => {
                  const Icon = page.Icon;
                  const active = activePage === page.id;
                  return (
                    <li key={page.id}>
                      <button
                        type="button"
                        onClick={() => onPageChange(page.id)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "editor-left-row",
                          active && "editor-left-row--active",
                        )}
                      >
                        <Icon
                          size={14}
                          strokeWidth={1.75}
                          className="editor-left-row__icon"
                          aria-hidden
                        />
                        <span className="editor-left-row__label">
                          {page.label[locale]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
