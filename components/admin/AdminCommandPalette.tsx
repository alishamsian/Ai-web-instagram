"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";

type CmdItem = {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords?: string;
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

  const items = useMemo<CmdItem[]>(() => {
    const g = (fa: string, en: string) => (isFa ? fa : en);
    return [
      {
        id: "dash",
        label: g("داشبورد", "Dashboard"),
        href: adminHref(locale, "/dashboard"),
        group: g("ناوبری", "Navigate"),
        keywords: "home founder",
      },
      {
        id: "users",
        label: g("کاربران", "Users"),
        href: adminHref(locale, "/users"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "workspaces",
        label: g("ورک‌اسپیس‌ها", "Workspaces"),
        href: adminHref(locale, "/workspaces"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "websites",
        label: g("سایت‌ها", "Websites"),
        href: adminHref(locale, "/websites"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "imports",
        label: g("ایمپورت‌ها", "Imports"),
        href: adminHref(locale, "/imports"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "jobs",
        label: g("جاب‌ها", "Jobs"),
        href: adminHref(locale, "/jobs"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "orders",
        label: g("سفارش‌ها", "Orders"),
        href: adminHref(locale, "/orders"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "ai",
        label: g("هوش مصنوعی", "AI"),
        href: adminHref(locale, "/ai"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "audit",
        label: g("ممیزی", "Audit"),
        href: adminHref(locale, "/audit"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "system",
        label: g("سلامت سیستم", "System health"),
        href: adminHref(locale, "/system"),
        group: g("ناوبری", "Navigate"),
      },
      {
        id: "export",
        label: g("خروجی داده — فاز بعد", "Export data — later phase"),
        href: adminHref(locale, "/settings"),
        group: g("اقدامات", "Actions"),
        keywords: "export",
      },
    ];
  }, [isFa, locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

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
          <Search className="size-4 text-[var(--admin-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                e.preventDefault();
                run(filtered[active]!);
              }
            }}
            placeholder={
              isFa ? "جستجوی کاربران، سایت‌ها، جاب‌ها…" : "Search users, sites, jobs…"
            }
            className="h-12 w-full bg-transparent text-sm text-[var(--admin-fg)] outline-none placeholder:text-[var(--admin-muted)]"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
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
