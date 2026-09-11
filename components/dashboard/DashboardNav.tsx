"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AtSign,
  ChartNoAxesColumn,
  CreditCard,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  website: Globe,
  import: AtSign,
  content: Images,
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
    <nav
      className="flex gap-1 overflow-x-auto px-3 py-3 md:block md:space-y-5 md:overflow-visible md:px-3 md:py-4"
      aria-label="Dashboard"
    >
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.id} className="contents md:block">
            <p className="mb-1.5 hidden px-3 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase md:block">
              {group.label}
            </p>
            <ul className="contents gap-1 md:flex md:flex-col md:gap-0.5">
              {groupItems.map((item) => {
                const href = `/${locale}/${item.href}`;
                const active =
                  item.href === "dashboard"
                    ? pathname === `/${locale}/dashboard` ||
                      pathname === `/${locale}/dashboard/`
                    : pathname === href || pathname.startsWith(`${href}/`);
                const Icon: LucideIcon = ICONS[item.icon];
                return (
                  <li key={item.href} className="contents md:block">
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-ink text-white shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">{item.label}</span>
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
