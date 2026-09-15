"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Moon,
  RefreshCw,
  Search,
  Sun,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRangePreset } from "@/lib/admin/dates";
import type { Locale } from "@/lib/config/env";
import type { AdminRole } from "@/lib/admin/permissions";

const PRESETS: { id: DateRangePreset; fa: string; en: string }[] = [
  { id: "today", fa: "امروز", en: "Today" },
  { id: "7d", fa: "۷روز", en: "7D" },
  { id: "30d", fa: "۳۰روز", en: "30D" },
  { id: "90d", fa: "۹۰روز", en: "90D" },
  { id: "6m", fa: "۶ماه", en: "6M" },
  { id: "12m", fa: "۱۲ماه", en: "12M" },
];

export function AdminTopbar({
  locale,
  role,
  email,
  theme,
  onToggleTheme,
  onOpenCommand,
  freshnessLabel,
  breadcrumbs,
}: {
  locale: Locale;
  role: AdminRole;
  email?: string | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenCommand: () => void;
  freshnessLabel: string;
  breadcrumbs: { label: string; href?: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const isFa = locale === "fa";
  const preset = (searchParams.get("range") as DateRangePreset) || "30d";

  function setRange(next: DateRangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", next);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/90 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--admin-muted)]">
            {breadcrumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden>/</span> : null}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-[var(--admin-fg)]"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="font-medium text-[var(--admin-fg)]">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="hidden items-center rounded-lg border border-[var(--admin-border)] p-0.5 md:flex"
            role="group"
            aria-label="Date range"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRange(p.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  preset === p.id
                    ? "bg-[var(--admin-fg)] text-[var(--admin-bg)]"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-fg)]",
                )}
              >
                {p[locale]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenCommand}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-1.5 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-fg)]"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">
              {isFa ? "جستجو" : "Search"}
            </span>
            <kbd className="hidden rounded border border-[var(--admin-border)] px-1.5 py-0.5 text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-fg)] disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-fg)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-3.5" />
            ) : (
              <Moon className="size-3.5" />
            )}
          </button>

          <span
            className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-muted)]"
            title={isFa ? "اعلان‌ها" : "Notifications"}
          >
            <Bell className="size-3.5" />
          </span>

          <div className="hidden items-center gap-2 rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 sm:flex">
            <div className="size-6 rounded-full bg-[var(--admin-muted-bg)] ring-1 ring-[var(--admin-border)]" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-[var(--admin-fg)]">
                {email ?? role}
              </p>
              <p className="text-[10px] text-[var(--admin-muted)]">{role}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-4 py-1.5 sm:px-6">
        <p className="text-[11px] text-[var(--admin-muted)]">{freshnessLabel}</p>
        <p className="text-[11px] text-[var(--admin-muted)]">
          {isFa ? "مقایسه با دوره قبل" : "vs previous period"}
        </p>
      </div>
    </header>
  );
}
