"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AtSign,
  CalendarDays,
  ChartNoAxesColumn,
  CreditCard,
  FileText,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  ListTodo,
  Radio,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  website: Globe,
  orders: ShoppingBag,
  import: AtSign,
  content: Images,
  posts: FileText,
  calendar: CalendarDays,
  queue: ListTodo,
  channels: Radio,
  analytics: ChartNoAxesColumn,
  domains: Link2,
  settings: Settings,
  billing: CreditCard,
} as const;

export type DashboardNavIcon = keyof typeof ICONS;

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: DashboardNavIcon;
  group: "main" | "growth" | "account";
  badge?: string;
  badgeTone?: "default" | "alert";
  /** Path prefix for active state when href has query params */
  match?: string;
  /** When true, only exact path match (no nested routes) */
  exact?: boolean;
};

export function DashboardNav({
  locale,
  items,
  groupLabels,
}: {
  locale: string;
  items: DashboardNavItem[];
  groupLabels: { main: string; growth: string; account: string };
}) {
  const pathname = usePathname();
  const groups = [
    { id: "main" as const, label: groupLabels.main },
    { id: "growth" as const, label: groupLabels.growth },
    { id: "account" as const, label: groupLabels.account },
  ];

  return (
    <nav className="hidden space-y-5 px-3 py-4 md:block" aria-label="Dashboard">
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.id}>
            <p className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {groupItems.map((item) => {
                const pathOnly = item.href.split("?")[0]!;
                const matchBase = item.match ?? pathOnly;
                const href = `/${locale}/${item.href}`;
                const active =
                  matchBase === "dashboard"
                    ? pathname === `/${locale}/dashboard` ||
                      pathname === `/${locale}/dashboard/`
                    : item.exact
                      ? pathname === `/${locale}/${matchBase}` ||
                        pathname === `/${locale}/${matchBase}/`
                      : pathname === `/${locale}/${matchBase}` ||
                        pathname.startsWith(`/${locale}/${matchBase}/`);
                const Icon: LucideIcon = ICONS[item.icon];
                return (
                  <li key={`${item.icon}-${pathOnly}`}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-ink text-white shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                      prefetch
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                            item.badgeTone === "alert" && !active
                              ? "bg-emerald-500/15 text-emerald-800"
                              : active
                                ? "bg-white/15 text-white"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
