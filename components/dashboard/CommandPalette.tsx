"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesColumn,
  FileText,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  ListTodo,
  Radio,
  Search,
  Settings,
  ShoppingBag,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CmdItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
  keywords?: string;
};

export function CommandPalette({
  locale,
  websiteId,
}: {
  locale: "fa" | "en";
  websiteId?: string | null;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const items = useMemo<CmdItem[]>(() => {
    const siteQ = websiteId ? `?id=${websiteId}` : "";
    return [
      {
        id: "home",
        label: isFa ? "خانه" : "Home",
        href: `/${locale}/dashboard`,
        group: isFa ? "فضای کاری" : "Workspace",
        keywords: "overview home",
      },
      {
        id: "website",
        label: isFa ? "سایت من" : "My site",
        href: `/${locale}/dashboard/website${siteQ}`,
        group: isFa ? "فضای کاری" : "Workspace",
      },
      {
        id: "orders",
        label: isFa ? "سفارش‌ها" : "Orders",
        href: `/${locale}/dashboard/orders`,
        group: isFa ? "فضای کاری" : "Workspace",
      },
      {
        id: "posts",
        label: isFa ? "پست‌ها" : "Posts",
        href: `/${locale}/dashboard/content/posts`,
        group: isFa ? "محتوا" : "Content",
      },
      {
        id: "calendar",
        label: isFa ? "تقویم انتشار" : "Publish calendar",
        href: `/${locale}/dashboard/content/calendar`,
        group: isFa ? "محتوا" : "Content",
      },
      {
        id: "queue",
        label: isFa ? "صف انتشار" : "Publish queue",
        href: `/${locale}/dashboard/content/queue`,
        group: isFa ? "محتوا" : "Content",
      },
      {
        id: "channels",
        label: isFa ? "کانال‌ها" : "Channels",
        href: `/${locale}/dashboard/channels`,
        group: isFa ? "محتوا" : "Content",
      },
      {
        id: "catalog",
        label: isFa ? "کاتالوگ" : "Catalog",
        href: `/${locale}/dashboard/content${siteQ}`,
        group: isFa ? "محتوا" : "Content",
      },
      {
        id: "domains",
        label: isFa ? "دامنه‌ها" : "Domains",
        href: `/${locale}/dashboard/domains`,
        group: isFa ? "وبسایت" : "Website",
      },
      {
        id: "import",
        label: isFa ? "ورود اینستاگرام" : "Instagram import",
        href: `/${locale}/dashboard/import`,
        group: isFa ? "وبسایت" : "Website",
      },
      {
        id: "analytics",
        label: isFa ? "آمار" : "Analytics",
        href: `/${locale}/dashboard/analytics`,
        group: isFa ? "رشد" : "Growth",
      },
      {
        id: "settings",
        label: isFa ? "تنظیمات" : "Settings",
        href: `/${locale}/dashboard/settings`,
        group: isFa ? "حساب" : "Account",
      },
    ];
  }, [isFa, locale, websiteId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.label} ${item.hint ?? ""} ${item.keywords ?? ""} ${item.group}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const icons: Record<string, typeof Search> = {
    home: LayoutDashboard,
    website: Globe,
    orders: ShoppingBag,
    posts: FileText,
    calendar: CalendarDays,
    queue: ListTodo,
    channels: Radio,
    catalog: Images,
    domains: Link2,
    import: AtSign,
    analytics: ChartNoAxesColumn,
    settings: Settings,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setQuery("");
        }}
        className="inline-flex size-9 items-center justify-center rounded-[10px] border border-border bg-white text-muted-foreground transition-colors hover:border-ink/25 hover:text-ink sm:h-9 sm:w-auto sm:gap-2 sm:px-2.5 sm:text-xs"
        aria-label={isFa ? "جستجو و پرش سریع" : "Search and jump"}
      >
        <Search className="size-3.5" aria-hidden />
        <span className="hidden md:inline">{isFa ? "پریدن…" : "Jump…"}</span>
        <kbd className="ms-1 hidden rounded border border-border bg-[#f6f6f4] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center px-0 pt-0 sm:items-start sm:px-4 sm:pt-[12vh]">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            aria-label={isFa ? "بستن" : "Close"}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isFa ? "فرمان سریع" : "Command palette"}
            className="relative max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:rounded-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((i) => Math.min(i + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && filtered[active]) {
                    e.preventDefault();
                    go(filtered[active]!.href);
                  }
                }}
                placeholder={
                  isFa ? "جستجو در داشبورد…" : "Search dashboard…"
                }
                className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {isFa ? "نتیجه‌ای نیست" : "No results"}
                </li>
              ) : (
                filtered.map((item, index) => {
                  const Icon = icons[item.id] ?? Search;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(item.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition-colors",
                          index === active
                            ? "bg-ink text-white"
                            : "text-ink hover:bg-[#f6f6f4]",
                        )}
                      >
                        <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "text-[11px]",
                            index === active
                              ? "text-white/70"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.group}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
