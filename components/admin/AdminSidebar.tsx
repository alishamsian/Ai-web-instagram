"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";
import type { AdminRole } from "@/lib/admin/permissions";

export function AdminSidebar({
  locale,
  role,
}: {
  locale: Locale;
  role: AdminRole;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isFa = locale === "fa";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-e border-[var(--admin-border)] bg-[var(--admin-sidebar)] transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] px-3 py-3.5">
        {!collapsed ? (
          <div className="min-w-0 px-1">
            <p className="truncate text-[11px] font-semibold tracking-[0.16em] text-[var(--admin-muted)]">
              VITRIN
            </p>
            <p className="truncate text-sm font-medium text-[var(--admin-fg)]">
              {isFa ? "کنسول بنیان‌گذار" : "Founder Console"}
            </p>
          </div>
        ) : (
          <span className="mx-auto text-xs font-bold text-[var(--admin-fg)]">V</span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-muted-bg)] hover:text-[var(--admin-fg)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-2 py-3"
        aria-label="Admin navigation"
      >
        {ADMIN_NAV.map((group) => (
          <div key={group.id} className="mb-4">
            {!collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--admin-muted)]">
                {group.label[locale]}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const href = adminHref(locale, item.href);
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      title={item.label[locale]}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                        active
                          ? "bg-[var(--admin-accent-soft)] font-medium text-[var(--admin-fg)]"
                          : "text-[var(--admin-muted)] hover:bg-[var(--admin-muted-bg)] hover:text-[var(--admin-fg)]",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-80" />
                      {!collapsed ? (
                        <>
                          <span className="min-w-0 flex-1 truncate">
                            {item.label[locale]}
                          </span>
                          {item.comingSoon ? (
                            <span className="rounded bg-[var(--admin-muted-bg)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--admin-muted)]">
                              {isFa ? "بعداً" : "Soon"}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--admin-border)] p-3">
        {!collapsed ? (
          <div className="rounded-lg bg-[var(--admin-muted-bg)] px-3 py-2.5">
            <p className="text-[11px] text-[var(--admin-muted)]">
              {isFa ? "نقش فعال" : "Active role"}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[var(--admin-fg)]">
              {role}
            </p>
          </div>
        ) : (
          <p className="text-center text-[9px] font-medium text-[var(--admin-muted)]">
            {role.slice(0, 3)}
          </p>
        )}
        <Link
          href={`/${locale}/dashboard`}
          className={cn(
            "mt-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--admin-muted)] hover:bg-[var(--admin-muted-bg)] hover:text-[var(--admin-fg)]",
            collapsed && "justify-center",
          )}
        >
          {isFa ? (
            <ChevronLeft className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5 rtl:rotate-180" />
          )}
          {!collapsed
            ? isFa
              ? "بازگشت به داشبورد"
              : "Back to product"
            : null}
        </Link>
      </div>
    </aside>
  );
}
