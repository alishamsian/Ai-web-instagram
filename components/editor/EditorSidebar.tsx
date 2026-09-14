"use client";

import { EditorLayersPanel } from "@/components/editor/EditorLayersPanel";
import { mediaEntries } from "@/components/editor/editor-utils";
import { sectionTypeIcon } from "@/components/editor/section-icons";
import type { EditorSiteGroup } from "@/lib/editor";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
import { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
import type { SectionCategory } from "@/lib/store/registry/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import {
  FileStack,
  FolderTree,
  Globe2,
  ImageIcon,
  Layers3,
  Plus,
  Search,
} from "lucide-react";

/** Left sidebar destinations (Views = honest section shortcuts). */
export type LeftNavTab = "views" | "layers" | "insert" | "assets" | "site";

const EDITOR_VIEWS = [
  {
    id: "home",
    group: "main" as const,
    label: { fa: "خانه", en: "Home" },
  },
  {
    id: "shop",
    group: "store" as const,
    label: { fa: "فروشگاه", en: "Shop" },
  },
  {
    id: "product",
    group: "store" as const,
    label: { fa: "محصول", en: "Product" },
  },
  {
    id: "about",
    group: "info" as const,
    label: { fa: "درباره", en: "About" },
  },
  {
    id: "contact",
    group: "info" as const,
    label: { fa: "تماس", en: "Contact" },
  },
  {
    id: "faq",
    group: "info" as const,
    label: { fa: "پرسش‌ها", en: "FAQ" },
  },
] as const;

export function EditorSidebar({
  config,
  dict,
  locale,
  nav,
  selectedSectionId,
  selectedField,
  hoveredSectionId,
  activePage,
  onNavChange,
  onSelectSection,
  onSelectField,
  onHoverSection,
  onChange,
  onAddSection,
  onInsertType,
  onPageChange,
  onOpenSiteGroup,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  nav: LeftNavTab;
  selectedSectionId?: string;
  selectedField?: EditorFieldPath;
  hoveredSectionId?: string;
  activePage: string;
  onNavChange: (tab: LeftNavTab) => void;
  onSelectSection: (id: string | undefined) => void;
  onSelectField: (path: EditorFieldPath, sectionId: string) => void;
  onHoverSection?: (id: string | undefined) => void;
  onChange: (next: WebsiteConfig) => void;
  onAddSection: () => void;
  onInsertType: (type: WebsiteSectionType) => void;
  onPageChange: (pageId: string) => void;
  onOpenSiteGroup: (group: EditorSiteGroup) => void;
}) {
  const rail: {
    id: LeftNavTab;
    label: string;
    icon: typeof Layers3;
  }[] = [
    { id: "views", label: dict.editor.views, icon: FileStack },
    { id: "layers", label: dict.editor.layers, icon: Layers3 },
    { id: "insert", label: dict.editor.insert, icon: Plus },
    { id: "assets", label: dict.editor.assets, icon: ImageIcon },
    { id: "site", label: dict.editor.sitePanel, icon: Globe2 },
  ];

  return (
    <div className="editor-sidebar-shell flex h-full min-h-0 bg-[color:var(--ed-bg-elevated)]">
      <nav
        className="editor-left-rail"
        aria-label={dict.editor.panelSections}
        role="tablist"
        aria-orientation="vertical"
      >
        {rail.map((item) => {
          const Icon = item.icon;
          const active = nav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={item.label}
              title={item.label}
              data-active={active}
              className="editor-left-rail-btn"
              onClick={() => onNavChange(item.id)}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span className="editor-left-rail-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-s border-[color:var(--ed-border)]">
        <div className="flex h-10 shrink-0 items-center border-b border-[color:var(--ed-border)] px-3">
          <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-[color:var(--ed-subtle)] uppercase">
            {rail.find((r) => r.id === nav)?.label}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {nav === "views" ? (
            <ViewsPanel
              dict={dict}
              locale={locale}
              activePage={activePage}
              onPageChange={onPageChange}
            />
          ) : null}
          {nav === "layers" ? (
            <EditorLayersPanel
              config={config}
              dict={dict}
              locale={locale}
              selectedSectionId={selectedSectionId}
              selectedField={selectedField}
              hoveredSectionId={hoveredSectionId}
              onSelectSection={onSelectSection}
              onSelectField={onSelectField}
              onHoverSection={onHoverSection}
              onChange={onChange}
              onAddSection={onAddSection}
            />
          ) : null}
          {nav === "insert" ? (
            <InsertPanel
              config={config}
              dict={dict}
              locale={locale}
              onInsertType={onInsertType}
              onOpenLibrary={onAddSection}
            />
          ) : null}
          {nav === "assets" ? (
            <AssetsPanel config={config} dict={dict} locale={locale} />
          ) : null}
          {nav === "site" ? (
            <SiteNavPanel
              dict={dict}
              onOpenSiteGroup={onOpenSiteGroup}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ViewsPanel({
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
  const groups = [
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
  ];

  return (
    <div className="space-y-3 px-2 py-2">
      <p className="px-1 text-[11.5px] leading-5 text-[color:var(--ed-muted)]">
        {dict.editor.viewsHint}
      </p>
      <label className="editor-search-field mx-0.5">
        <Search size={13} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.editor.searchSections}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[color:var(--ed-fg)] outline-none placeholder:text-[color:var(--ed-subtle)]"
        />
      </label>
      {groups.map((group) => {
        const items = group.items.filter((item) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return item.label[locale].toLowerCase().includes(q);
        });
        if (!items.length) return null;
        return (
          <div key={group.id}>
            <p className="editor-panel-label">{group.title}</p>
            <ul className="space-y-0.5 px-0.5" role="list">
              {items.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => onPageChange(page.id)}
                    aria-current={activePage === page.id ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-[var(--ed-radius)] px-2.5 py-1.5 text-start text-[12.5px] transition",
                      activePage === page.id
                        ? "bg-[color:var(--ed-select-soft)] text-[color:var(--ed-fg)]"
                        : "text-[color:var(--ed-muted)] hover:bg-[color:var(--ed-bg-hover)] hover:text-[color:var(--ed-fg)]",
                    )}
                  >
                    <FolderTree size={13} className="shrink-0 opacity-60" />
                    <span className="min-w-0 flex-1 truncate">
                      {page.label[locale]}
                    </span>
                    {page.id === "home" ? (
                      <span className="text-[9px] font-semibold tracking-wide text-[color:var(--ed-subtle)] uppercase">
                        {dict.editor.homeView}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function InsertPanel({
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

  const categories = useMemo(() => {
    const used = new Set(library.map((item) => item.category));
    return SECTION_CATEGORIES.filter((item) => used.has(item.id));
  }, [library]);

  return (
    <div className="space-y-3 px-2 py-2">
      <p className="px-1 text-[11.5px] leading-5 text-[color:var(--ed-muted)]">
        {dict.editor.insertHint}
      </p>
      <label className="editor-search-field mx-0.5">
        <Search size={13} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.editor.searchSections}
          className="min-w-0 flex-1 bg-transparent text-[12px] text-[color:var(--ed-fg)] outline-none placeholder:text-[color:var(--ed-subtle)]"
        />
      </label>
      <div className="flex flex-wrap gap-1 px-0.5">
        <button
          type="button"
          data-active={category === "all"}
          className="editor-chip"
          onClick={() => setCategory("all")}
        >
          {dict.editor.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-active={category === cat.id}
            className="editor-chip"
            onClick={() => setCategory(cat.id)}
          >
            {cat[locale]}
          </button>
        ))}
      </div>
      <ul className="space-y-1 px-0.5">
        {items.map((item) => {
          const present = existing.has(item.type);
          const Icon = sectionTypeIcon(item.type);
          return (
            <li key={item.type}>
              <button
                type="button"
                onClick={() => onInsertType(item.type)}
                className="editor-insert-row group"
              >
                <span className="editor-insert-icon">
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1 text-start">
                  <span className="block truncate text-[12.5px] font-medium text-[color:var(--ed-fg)]">
                    {item.label[locale]}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[color:var(--ed-muted)]">
                    {item.description[locale]}
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-[color:var(--ed-subtle)]">
                    {SECTION_CATEGORIES.find((c) => c.id === item.category)?.[
                      locale
                    ] ?? item.category}
                  </span>
                </span>
                <span className="text-[10px] text-[color:var(--ed-subtle)]">
                  {present ? dict.editor.showSection : dict.editor.addSection}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onOpenLibrary}
        className="mx-0.5 mb-2 w-[calc(100%-4px)] rounded-[var(--ed-radius)] border border-[color:var(--ed-border)] px-3 py-2 text-[12px] text-[color:var(--ed-muted)] transition hover:border-[color:var(--ed-border-strong)] hover:text-[color:var(--ed-fg)]"
      >
        {dict.editor.openLibrary}
      </button>
    </div>
  );
}

function AssetsPanel({
  config,
  dict,
  locale,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
}) {
  const [query, setQuery] = useState("");
  const entries = useMemo(() => mediaEntries(config), [config]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(([id, item]) => {
      const alt = item.alt ?? "";
      return id.toLowerCase().includes(q) || alt.toLowerCase().includes(q);
    });
  }, [entries, query]);

  return (
    <div className="space-y-3 px-2 py-2">
      <p className="px-1 text-[11.5px] leading-5 text-[color:var(--ed-muted)]">
        {dict.editor.assetsHint}
      </p>
      {entries.length ? (
        <label className="editor-search-field mx-0.5">
          <Search size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "fa" ? "جستجوی رسانه…" : "Search media…"}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[color:var(--ed-fg)] outline-none placeholder:text-[color:var(--ed-subtle)]"
          />
        </label>
      ) : null}

      {!entries.length ? (
        <div className="px-3 py-10 text-center">
          <ImageIcon
            size={22}
            className="mx-auto text-[color:var(--ed-subtle)]"
          />
          <p className="mt-3 text-[13px] text-[color:var(--ed-fg)]">
            {dict.editor.assetsEmpty}
          </p>
          <p className="mt-1 text-[11.5px] leading-5 text-[color:var(--ed-muted)]">
            {dict.editor.assetsEmptyHint}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 px-0.5">
          {filtered.map(([id, item]) => (
            <figure
              key={id}
              className="editor-asset-tile group overflow-hidden"
              title={item.alt || id}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.alt || id}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover"
              />
              <figcaption className="truncate px-1.5 py-1 text-[10px] text-[color:var(--ed-muted)]">
                {item.alt || id}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteNavPanel({
  dict,
  onOpenSiteGroup,
}: {
  dict: Dictionary;
  onOpenSiteGroup: (group: EditorSiteGroup) => void;
}) {
  const groups: {
    title: string;
    items: { label: string; group: EditorSiteGroup }[];
  }[] = [
    {
      title: dict.editor.groupIdentity,
      items: [{ label: dict.editor.brand, group: "content" }],
    },
    {
      title: dict.editor.groupDesign,
      items: [
        { label: dict.editor.colors, group: "style" },
        { label: dict.editor.typography, group: "style" },
        { label: dict.editor.designSystem, group: "style" },
        { label: dict.editor.designPresets, group: "style" },
      ],
    },
    {
      title: dict.editor.groupSeo,
      items: [{ label: dict.editor.seo, group: "site" }],
    },
    {
      title: dict.editor.groupSettings,
      items: [
        { label: dict.editor.settings, group: "site" },
        { label: dict.editor.template, group: "site" },
        { label: dict.editor.versions, group: "site" },
      ],
    },
  ];

  return (
    <div className="space-y-3 px-2 py-2">
      <p className="px-1 text-[11.5px] leading-5 text-[color:var(--ed-muted)]">
        {dict.editor.sitePanelHint}
      </p>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="editor-panel-label">{group.title}</p>
          <ul className="space-y-0.5 px-0.5">
            {group.items.map((item) => (
              <li key={`${group.title}-${item.label}`}>
                <button
                  type="button"
                  onClick={() => onOpenSiteGroup(item.group)}
                  className="flex w-full items-center rounded-[var(--ed-radius)] px-2.5 py-1.5 text-start text-[12.5px] text-[color:var(--ed-muted)] transition hover:bg-[color:var(--ed-bg-hover)] hover:text-[color:var(--ed-fg)]"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
