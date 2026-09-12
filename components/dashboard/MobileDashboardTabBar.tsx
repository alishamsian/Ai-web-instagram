"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChartNoAxesColumn,
  Globe,
  LayoutDashboard,
  MoreHorizontal,
  ShoppingBag,
  AtSign,
  CalendarDays,
  FileText,
  Images,
  Link2,
  ListTodo,
  Radio,
  Settings,
  CreditCard,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "dashboard", icon: LayoutDashboard, fa: "خانه", en: "Home" },
  { href: "dashboard/website", icon: Globe, fa: "سایت", en: "Site" },
  { href: "dashboard/content", icon: Images, fa: "محتوا", en: "Content", exact: true },
  { href: "dashboard/orders", icon: ShoppingBag, fa: "سفارش", en: "Orders" },
  { href: "more", icon: MoreHorizontal, fa: "بیشتر", en: "More", isMore: true },
] as const;

const MORE_LINKS = [
  { href: "dashboard/content/posts", icon: FileText, fa: "پست‌ها", en: "Posts" },
  { href: "dashboard/channels", icon: Radio, fa: "کانال‌ها", en: "Channels" },
  { href: "dashboard/content/calendar", icon: CalendarDays, fa: "تقویم", en: "Calendar" },
  { href: "dashboard/content/queue", icon: ListTodo, fa: "صف", en: "Queue" },
  { href: "dashboard/domains", icon: Link2, fa: "دامنه", en: "Domains" },
  { href: "dashboard/import", icon: AtSign, fa: "ورود", en: "Import" },
  { href: "dashboard/analytics", icon: ChartNoAxesColumn, fa: "آمار", en: "Analytics" },
  { href: "dashboard/settings", icon: Settings, fa: "تنظیمات", en: "Settings" },
  { href: "dashboard/billing", icon: CreditCard, fa: "صورتحساب", en: "Billing" },
] as const;

export function MobileDashboardTabBar({
  locale,
  freshOrders = 0,
}: {
  locale: "fa" | "en";
  freshOrders?: number;
}) {
  const pathname = usePathname();
  const isFa = locale === "fa";
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const moreActive = MORE_LINKS.some((link) => {
    const href = `/${locale}/${link.href}`;
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            aria-label={isFa ? "بستن" : "Close"}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] mx-3 mb-1 max-h-[min(70vh,32rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {isFa ? "بخش‌های بیشتر" : "More"}
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-ink"
                aria-label={isFa ? "بستن" : "Close"}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <ul className="grid max-h-[calc(min(70vh,32rem)-3.25rem)] grid-cols-2 gap-1 overflow-y-auto overscroll-contain p-2 sm:grid-cols-3">
              {MORE_LINKS.map((link) => {
                const href = `/${locale}/${link.href}`;
                const pathOnly = href.split("?")[0]!;
                const active =
                  pathname === pathOnly ||
                  pathname.startsWith(`${pathOnly}/`) ||
                  pathname === href;
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-[12px] font-medium",
                        active
                          ? "bg-ink text-white"
                          : "text-muted-foreground hover:bg-muted hover:text-ink",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                      {isFa ? link.fa : link.en}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl md:hidden"
        aria-label={isFa ? "ناو موبایل" : "Mobile navigation"}
      >
        <ul className="grid grid-cols-5 gap-0.5">
          {TABS.map((tab) => {
            if ("isMore" in tab && tab.isMore) {
              return (
                <li key="more">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    className={cn(
                      "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight",
                      moreOpen || moreActive
                        ? "bg-ink text-white"
                        : "text-muted-foreground",
                    )}
                    aria-expanded={moreOpen}
                  >
                    <MoreHorizontal className="size-[18px]" aria-hidden />
                    {isFa ? tab.fa : tab.en}
                  </button>
                </li>
              );
            }
            const href = `/${locale}/${tab.href}`;
            const exact = "exact" in tab && tab.exact;
            const active =
              tab.href === "dashboard"
                ? pathname === `/${locale}/dashboard` ||
                  pathname === `/${locale}/dashboard/`
                : exact
                  ? pathname === href || pathname === `${href}/`
                  : pathname === href || pathname.startsWith(`${href}/`);
            const Icon = tab.icon;
            const showOrdersBadge =
              tab.href === "dashboard/orders" && freshOrders > 0;
            return (
              <li key={tab.href}>
                <Link
                  href={href}
                  className={cn(
                    "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight",
                    active ? "bg-ink text-white" : "text-muted-foreground",
                  )}
                >
                  <span className="relative">
                    <Icon className="size-[18px]" aria-hidden />
                    {showOrdersBadge ? (
                      <span
                        className={cn(
                          "absolute -end-2.5 -top-1.5 min-w-4 rounded-full px-1 text-[9px] font-semibold leading-4",
                          active
                            ? "bg-white text-ink"
                            : "bg-emerald-600 text-white",
                        )}
                      >
                        {freshOrders > 9 ? "9+" : freshOrders}
                      </span>
                    ) : null}
                  </span>
                  {isFa ? tab.fa : tab.en}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
