"use client";

import { useMemo, useState } from "react";
import { Puck, usePuck } from "@puckeditor/core";
import { Eye, EyeOff, Layers, Package, Search } from "lucide-react";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import { getSectionDefinition } from "@/lib/store/registry";
import { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
import { humanSectionLabel } from "@/lib/puck/binding";
import { bindToggleSectionVisibility } from "@/lib/puck/binding";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type LeftTab = "layers" | "components";

function sectionContentHints(
  type: string,
  isFa: boolean,
): string[] {
  const map: Record<string, { fa: string[]; en: string[] }> = {
    hero: {
      fa: ["عنوان", "توضیح", "دکمه CTA"],
      en: ["Heading", "Description", "CTA"],
    },
    products: {
      fa: ["عنوان", "کارت محصول"],
      en: ["Title", "Product cards"],
    },
    services: {
      fa: ["عنوان", "کارت خدمت"],
      en: ["Title", "Service cards"],
    },
    testimonials: {
      fa: ["عنوان", "نظرات"],
      en: ["Title", "Quotes"],
    },
    gallery: {
      fa: ["عنوان", "تصاویر"],
      en: ["Title", "Images"],
    },
    faq: {
      fa: ["عنوان", "سوالات"],
      en: ["Title", "Questions"],
    },
    footer: {
      fa: ["لینک‌ها", "برندینگ"],
      en: ["Links", "Branding"],
    },
  };
  const entry = map[type];
  if (!entry) return [];
  return isFa ? entry.fa : entry.en;
}

export function PuckLeftPanel({
  locale,
  config,
  onConfigChange,
}: {
  locale: Locale;
  config: WebsiteConfig;
  onConfigChange: (next: WebsiteConfig) => void;
}) {
  const isFa = locale === "fa";
  const [tab, setTab] = useState<LeftTab>("layers");
  const [query, setQuery] = useState("");
  const { selectedItem, getSelectorForId, dispatch } = usePuck();

  const library = useMemo(() => {
    const items = getSectionLibraryItems({
      vertical: config.settings.vertical,
    });
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = item.label[locale] ?? item.label.en ?? item.type;
      return (
        label.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.description[locale] ?? "").toLowerCase().includes(q)
      );
    });
  }, [config.settings.vertical, locale, query]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof library>();
    for (const cat of SECTION_CATEGORIES) map.set(cat.id, []);
    for (const item of library) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return SECTION_CATEGORIES.map((cat) => ({
      ...cat,
      items: map.get(cat.id) ?? [],
    })).filter((c) => c.items.length > 0);
  }, [library]);

  return (
    <aside
      className="flex h-full w-[280px] shrink-0 flex-col border-e border-zinc-200 bg-white"
      aria-label={isFa ? "ناوبری ادیتور" : "Editor navigation"}
    >
      <div className="flex border-b border-zinc-200 p-1">
        {(
          [
            { id: "layers" as const, icon: Layers, fa: "لایه‌ها", en: "Layers" },
            {
              id: "components" as const,
              icon: Package,
              fa: "کامپوننت‌ها",
              en: "Components",
            },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition",
                tab === t.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100",
              )}
            >
              <Icon className="size-3.5" />
              {isFa ? t.fa : t.en}
            </button>
          );
        })}
      </div>

      {tab === "layers" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {isFa ? "ساختار صفحه" : "Page structure"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {config.sections.map((section) => {
                const def = getSectionDefinition(section.type);
                const label = humanSectionLabel(
                  section,
                  locale,
                  def?.label ?? null,
                );
                const selected =
                  selectedItem?.props?.id === section.id ||
                  selectedItem?.props?.sectionId === section.id;
                const childHints = sectionContentHints(section.type, isFa);
                return (
                  <li key={section.id}>
                    <div
                      className={cn(
                        "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                        selected
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-800 hover:bg-zinc-100",
                        !section.visible && "opacity-60",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-start"
                        onClick={() => {
                          const selector = getSelectorForId(section.id);
                          if (selector) {
                            dispatch({
                              type: "setUi",
                              ui: { itemSelector: selector },
                            });
                          }
                        }}
                      >
                        {label}
                      </button>
                      <button
                        type="button"
                        title={
                          section.visible
                            ? isFa
                              ? "مخفی کردن"
                              : "Hide"
                            : isFa
                              ? "نمایش"
                              : "Show"
                        }
                        className={cn(
                          "rounded p-1 opacity-0 transition group-hover:opacity-100",
                          selected ? "hover:bg-white/10" : "hover:bg-zinc-200",
                        )}
                        onClick={() =>
                          bindToggleSectionVisibility({
                            config,
                            sectionId: section.id,
                            onChange: onConfigChange,
                          })
                        }
                      >
                        {section.visible ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <EyeOff className="size-3.5" />
                        )}
                      </button>
                    </div>
                    {selected && childHints.length > 0 ? (
                      <ul className="ms-3 mt-0.5 space-y-0.5 border-s border-zinc-200 ps-2">
                        {childHints.map((hint) => (
                          <li
                            key={hint}
                            className="truncate py-0.5 text-[11px] text-zinc-500"
                          >
                            {hint}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {isFa ? "Outline پوک" : "Puck outline"}
              </p>
              <div className="rounded-md border border-zinc-100 bg-zinc-50/80 p-1">
                <Puck.Outline />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-zinc-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isFa ? "جستجوی سکشن…" : "Search sections…"}
                className="h-8 ps-8 text-xs"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {byCategory.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-zinc-500">
                {isFa ? "موردی یافت نشد" : "No sections found"}
              </p>
            ) : (
              byCategory.map((cat) => (
                <div key={cat.id} className="mb-4">
                  <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {isFa ? cat.fa : cat.en}
                  </p>
                  <ul className="space-y-1">
                    {cat.items.map((item) => (
                      <li
                        key={item.type}
                        className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-2"
                      >
                        <p className="text-xs font-medium text-zinc-900">
                          {item.label?.[locale] ?? item.label?.en ?? item.type}
                        </p>
                        {item.description?.[locale] || item.description?.en ? (
                          <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">
                            {item.description?.[locale] ??
                              item.description?.en}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
            <div className="mt-2 border-t border-zinc-100 pt-3">
              <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {isFa ? "کشیدن به بوم" : "Drag onto canvas"}
              </p>
              <div className="rounded-md border border-zinc-100 bg-zinc-50/80 p-1">
                <Puck.Components />
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
