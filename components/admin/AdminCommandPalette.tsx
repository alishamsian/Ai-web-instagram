"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";

type CmdItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords?: string;
};

type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function AdminCommandPalette({
  locale,
  open,
  onOpenChange,
}: {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const navItems = useMemo<CmdItem[]>(() => {
    return ADMIN_NAV.flatMap((group) =>
      group.items
        .filter((item) => !item.comingSoon)
        .map((item) => ({
          id: `nav-${item.id}`,
          label: isFa ? item.label.fa : item.label.en,
          href: adminHref(locale, item.href),
          group: isFa ? group.label.fa : group.label.en,
          keywords: item.id,
        })),
    );
  }, [isFa, locale]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems.slice(0, 12);
    return navItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.keywords?.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [navItems, query]);

  const entityItems = useMemo<CmdItem[]>(
    () =>
      hits.map((h) => ({
        id: `hit-${h.type}-${h.id}`,
        label: h.subtitle ? `${h.title} — ${h.subtitle}` : h.title,
        href: h.href,
        group: h.type,
      })),
    [hits],
  );

  const filtered = useMemo(
    () => [...entityItems, ...filteredNav],
    [entityItems, filteredNav],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
  }, [query, open, filtered.length]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 2) {
      setHits((prev) => (prev.length === 0 ? prev : []));
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q)}&locale=${locale}`,
        );
        if (!res.ok) {
          if (!cancelled) setHits((prev) => (prev.length === 0 ? prev : []));
          return;
        }
        const payload = (await res.json()) as { hits?: SearchHit[] };
        if (!cancelled) setHits(payload.hits ?? []);
      } catch {
        if (!cancelled) setHits((prev) => (prev.length === 0 ? prev : []));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, locale]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setHits((prev) => (prev.length === 0 ? prev : []));
    setSearching(false);
    setActive(0);
  }, [open]);

  if (!open) return null;

  function run(item: CmdItem) {
    onOpenChange(false);
    setQuery("");
    router.push(item.href);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label={isFa ? "پالت فرمان" : "Command palette"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-elevated)]">
        <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-3">
          <Search className="size-4 text-[var(--admin-muted)]" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) =>
                  Math.min(a + 1, Math.max(filtered.length - 1, 0)),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                e.preventDefault();
                run(filtered[active]!);
              }
            }}
            placeholder={
              isFa
                ? "جستجوی کاربران، سایت‌ها، جاب‌ها…"
                : "Search users, sites, jobs…"
            }
            className="h-12 w-full bg-transparent text-sm text-[var(--admin-fg)] outline-none placeholder:text-[var(--admin-muted)]"
            aria-autocomplete="list"
            aria-controls="admin-command-results"
          />
        </div>
        <ul
          id="admin-command-results"
          className="max-h-80 overflow-y-auto p-2"
          role="listbox"
        >
          {searching ? (
            <li className="px-3 py-4 text-center text-xs text-[var(--admin-muted)]">
              {isFa ? "جستجو…" : "Searching…"}
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-[var(--admin-muted)]">
              {isFa ? "نتیجه‌ای نیست" : "No results"}
            </li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm",
                    i === active
                      ? "bg-[var(--admin-accent-soft)] text-[var(--admin-fg)]"
                      : "text-[var(--admin-muted)] hover:bg-[var(--admin-muted-bg)]",
                  )}
                >
                  <span className="font-medium text-[var(--admin-fg)]">
                    {item.label}
                  </span>
                  <span className="text-[11px]">{item.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
