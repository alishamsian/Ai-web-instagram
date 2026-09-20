"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/config/env";
import type { Dictionary } from "@/lib/i18n/dictionary";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_STYLES,
  type TemplateCatalogItem,
  type TemplateCategory,
  type TemplateStyle,
} from "@/lib/templates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function labelFor(
  locale: Locale,
  item: { fa: string; en: string },
): string {
  return locale === "fa" ? item.fa : item.en;
}

function categoryLabel(locale: Locale, id: TemplateCategory | "all"): string {
  if (id === "all") return "";
  const found = TEMPLATE_CATEGORIES.find((c) => c.id === id);
  return found ? labelFor(locale, found.label) : id;
}

function styleLabel(locale: Locale, id: TemplateStyle | "all"): string {
  if (id === "all") return "";
  const found = TEMPLATE_STYLES.find((s) => s.id === id);
  return found ? labelFor(locale, found.label) : id;
}

export function TemplateCatalogClient({
  locale,
  dict,
  initialTemplates,
}: {
  locale: Locale;
  dict: Dictionary;
  initialTemplates: TemplateCatalogItem[];
}) {
  const t = dict.templateCatalog;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const [style, setStyle] = useState<TemplateStyle | "all">("all");

  const categoriesInCatalog = useMemo(() => {
    const ids = new Set(initialTemplates.map((item) => item.category));
    return TEMPLATE_CATEGORIES.filter((c) => ids.has(c.id));
  }, [initialTemplates]);

  const stylesInCatalog = useMemo(() => {
    const ids = new Set(initialTemplates.map((item) => item.style));
    return TEMPLATE_STYLES.filter((s) => ids.has(s.id));
  }, [initialTemplates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialTemplates.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (style !== "all" && item.style !== style) return false;
      if (!q) return true;
      const hay = [
        item.id,
        item.slug,
        item.name.en,
        item.name.fa,
        item.description.en,
        item.description.fa,
        item.category,
        item.style,
        ...item.tags,
        ...item.features,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialTemplates, query, category, style]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink md:text-5xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t.body}</p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        <label className="sr-only" htmlFor="template-search">
          {t.searchLabel}
        </label>
        <Input
          id="template-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.searchLabel}
          className="max-w-md"
        />

        <div
          role="group"
          aria-label={t.categories}
          className="flex flex-wrap gap-2"
        >
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            label={t.allCategories}
          />
          {categoriesInCatalog.map((c) => (
            <FilterChip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
              label={labelFor(locale, c.label)}
            />
          ))}
        </div>

        <div
          role="group"
          aria-label={t.styles}
          className="flex flex-wrap gap-2"
        >
          <FilterChip
            active={style === "all"}
            onClick={() => setStyle("all")}
            label={t.allStyles}
          />
          {stylesInCatalog.map((s) => (
            <FilterChip
              key={s.id}
              active={style === s.id}
              onClick={() => setStyle(s.id)}
              label={labelFor(locale, s.label)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground" role="status">
          {t.noResults}
        </p>
      ) : (
        <ul className="mt-10 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_16px_48px_rgba(18,18,18,0.04)]">
                <Link
                  href={`/${locale}/templates/${item.id}`}
                  className="group relative block aspect-[16/11] overflow-hidden bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  aria-label={`${labelFor(locale, item.name)} — ${t.preview}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      item.thumbnail ||
                      `https://picsum.photos/seed/vitrin-tpl-${item.slug}/960/640`
                    }
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <h2 className="text-lg font-medium text-ink">
                      {labelFor(locale, item.name)}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {labelFor(locale, item.description)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-1">
                      {categoryLabel(locale, item.category)}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1">
                      {styleLabel(locale, item.style)}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1">
                      {item.pageCount} {t.pages}
                    </span>
                  </div>
                  {item.features.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label={t.features}>
                      {item.features.slice(0, 4).map((f) => (
                        <li
                          key={f}
                          className="rounded-md border border-border px-2 py-0.5 text-[11px] text-foreground-muted"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button asChild size="sm">
                      <Link href={`/${locale}/templates/${item.id}`}>
                        {t.preview}
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active
          ? "border-ink bg-ink text-white"
          : "border-border bg-white text-foreground-muted hover:border-ink/40 hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}
