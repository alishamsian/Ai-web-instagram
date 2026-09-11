import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { planUsageLabel, countFreshNewOrders } from "@/lib/dashboard/data";
import { countWebsitesForWorkspace } from "@/lib/database/queries";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { isProPlan } from "@/lib/config/plans";
import { LogoMark } from "@/components/shared/chrome";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { MobileDashboardTabBar } from "@/components/dashboard/MobileDashboardTabBar";
import {
  DashboardNav,
  type DashboardNavItem,
} from "@/components/dashboard/DashboardNav";
import { StatusBadge } from "@/components/dashboard/ui";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";

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
  const isPro = isProPlan(session.workspace.plan);
  const [siteCount, freshOrders, primarySiteId] = await Promise.all([
    countWebsitesForWorkspace(session.workspace.id),
    countFreshNewOrders(session.workspace.id, 24),
    getPrimarySiteIdCookie(),
  ]);
  const usage = planUsageLabel(session.workspace.plan, siteCount, locale);
  const isFa = locale === "fa";
  const websiteHref = primarySiteId
    ? `dashboard/website?id=${primarySiteId}`
    : "dashboard/website";

  const items: DashboardNavItem[] = [
    {
      href: "dashboard",
      icon: "dashboard",
      label: dict.dashboard.title,
      group: "main",
    },
    {
      href: websiteHref,
      icon: "website",
      label: dict.dashboard.website,
      group: "main",
      match: "dashboard/website",
    },
    {
      href: "dashboard/orders",
      icon: "orders",
      label: isFa ? "سفارش‌ها" : "Orders",
      group: "main",
      badge: freshOrders > 0 ? String(freshOrders) : undefined,
      badgeTone: freshOrders > 0 ? "alert" : undefined,
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
      badge: isPro ? undefined : "Pro",
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

  const planLabel = isPro
    ? isFa
      ? "حرفه‌ای"
      : "Pro"
    : isFa
      ? "شروع"
      : "Starter";

  return (
    <div className="relative min-h-screen bg-[#f4f4f2] md:grid md:grid-cols-[272px_1fr]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.9),transparent_55%),linear-gradient(180deg,#f7f7f5_0%,#f1f1ef_100%)]"
        aria-hidden
      />

      <aside className="relative z-[1] border-b border-border/80 bg-white/90 backdrop-blur-xl md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-e md:border-border/80">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border/80 px-5">
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
          <p className="hidden px-6 pb-4 text-[11px] text-muted-foreground md:block">
            {usage}
          </p>
        </div>

        <div className="hidden border-t border-border/80 p-3 md:block">
          <div className="mb-3 rounded-2xl bg-[#f6f6f4] px-3 py-3 ring-1 ring-border/60">
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

      <div className="relative z-[1] min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-white/80 px-4 backdrop-blur-xl md:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink md:hidden">
              {session.workspace.name}
            </p>
            <p className="hidden truncate text-sm text-muted-foreground md:block">
              <span className="font-medium text-ink">{session.workspace.name}</span>
              <span className="mx-2 text-border">·</span>
              {usage}
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
              <Link href={`/${locale}/create`}>
                <Plus className="size-3.5" aria-hidden />
                {dict.dashboard.newSite}
              </Link>
            </Button>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </div>
      <MobileDashboardTabBar locale={locale} freshOrders={freshOrders} />
    </div>
  );
}
