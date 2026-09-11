import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { LogoMark } from "@/components/shared/chrome";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import {
  DashboardNav,
  type DashboardNavItem,
} from "@/components/dashboard/DashboardNav";
import { StatusBadge } from "@/components/dashboard/ui";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login?next=/${locale}/dashboard`);
  const dict = getDictionary(locale);

  const items: DashboardNavItem[] = [
    {
      href: "dashboard",
      icon: "dashboard",
      label: dict.dashboard.title,
      group: "main",
    },
    {
      href: "dashboard/website",
      icon: "website",
      label: dict.dashboard.website,
      group: "main",
    },
    {
      href: "dashboard/import",
      icon: "import",
      label: dict.dashboard.import,
      group: "main",
    },
    {
      href: "dashboard/content",
      icon: "content",
      label: dict.dashboard.content,
      group: "main",
    },
    {
      href: "dashboard/analytics",
      icon: "analytics",
      label: dict.dashboard.analytics,
      group: "growth",
    },
    {
      href: "dashboard/domains",
      icon: "domains",
      label: dict.dashboard.domains,
      group: "growth",
    },
    {
      href: "dashboard/settings",
      icon: "settings",
      label: dict.dashboard.settings,
      group: "account",
    },
    {
      href: "dashboard/billing",
      icon: "billing",
      label: dict.dashboard.billing,
      group: "account",
    },
  ];

  const planLabel =
    session.workspace.plan === "pro"
      ? locale === "fa"
        ? "حرفه‌ای"
        : "Pro"
      : locale === "fa"
        ? "شروع"
        : "Starter";

  return (
    <div className="min-h-screen bg-[#f6f6f6] md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-e">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-5">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="text-sm font-semibold tracking-tight">{dict.brand}</span>
          </Link>
          <StatusBadge tone="accent">{planLabel}</StatusBadge>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardNav
            locale={locale}
            items={items}
            groupLabels={{
              main: dict.dashboard.navMain,
              growth: dict.dashboard.navGrowth,
              account: dict.dashboard.navAccount,
            }}
          />
        </div>

        <div className="hidden border-t border-border p-3 md:block">
          <div className="mb-3 rounded-2xl bg-muted px-3 py-3">
            <p className="truncate text-xs font-medium text-ink">
              {session.user.name || session.user.email.split("@")[0]}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {session.user.email}
            </p>
          </div>
          <SignOutButton label={dict.dashboard.signOut} locale={locale} />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-white/90 px-4 backdrop-blur-xl md:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink md:hidden">
              {session.user.name || dict.dashboard.title}
            </p>
            <p className="hidden truncate text-sm text-muted-foreground md:block">
              {session.workspace.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link href={`/${locale}/dashboard/import`}>
                <Sparkles className="size-3.5" aria-hidden />
                {dict.dashboard.refreshImport}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/${locale}/create`}>{dict.dashboard.newSite}</Link>
            </Button>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
