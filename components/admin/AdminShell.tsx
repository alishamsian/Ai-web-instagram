"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import type { Locale } from "@/lib/config/env";
import type { AdminRole } from "@/lib/admin/permissions";
import { relativeTime } from "@/components/admin/format";

export function AdminShell({
  locale,
  role,
  email,
  breadcrumbs,
  children,
}: {
  locale: Locale;
  role: AdminRole;
  email?: string | null;
  breadcrumbs: { label: string; href?: string }[];
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [commandOpen, setCommandOpen] = useState(false);
  const [loadedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    const stored = window.localStorage.getItem("vitrin-admin-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    // Persist only after mount hydration so we don't overwrite stored preference.
    const frame = window.requestAnimationFrame(() => {
      window.localStorage.setItem("vitrin-admin-theme", theme);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [theme]);

  const freshnessLabel =
    locale === "fa"
      ? `به‌روز شده ${relativeTime(loadedAt, "fa")}`
      : `Updated ${relativeTime(loadedAt, "en")}`;

  return (
    <div
      className="admin-console flex min-h-dvh bg-[var(--admin-bg)] text-[var(--admin-fg)]"
      data-admin-theme={theme}
    >
      <AdminSidebar locale={locale} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          locale={locale}
          role={role}
          email={email}
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
          onOpenCommand={() => setCommandOpen(true)}
          freshnessLabel={freshnessLabel}
          breadcrumbs={breadcrumbs}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
      <AdminCommandPalette
        locale={locale}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}
