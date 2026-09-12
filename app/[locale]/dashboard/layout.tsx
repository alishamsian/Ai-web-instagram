import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  getCachedNavMetrics,
  getWorkspaceOrders,
  getWorkspaceWebsites,
  planUsageLabel,
  siteLogoUrl,
} from "@/lib/dashboard/data";
import { SiteSwitcher } from "@/components/dashboard/SiteSwitcher";
import { buildDashboardNavItems } from "@/lib/dashboard/nav-items";
import { buildActivityFeed } from "@/lib/dashboard/ops";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { isProPlan } from "@/lib/config/plans";
import { LogoMark } from "@/components/shared/chrome";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { MobileDashboardTabBar } from "@/components/dashboard/MobileDashboardTabBar";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardHeaderTools } from "@/components/dashboard/DashboardHeaderTools";
import { StatusBadge } from "@/components/dashboard/ui";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";

/** Dashboard chrome: sidebar + header tools. Nav items live in nav-items.ts */
async function NavWithMetrics(props: {
  workspaceId: string;
  plan: "free" | "pro";
  locale: "fa" | "en";
  dict: ReturnType<typeof getDictionary>;
  websiteHref: string;
}) {
  const { workspaceId, plan, locale, dict, websiteHref } = props;
  const { siteCount, freshOrders } = await getCachedNavMetrics(workspaceId);
  const usage = planUsageLabel(plan, siteCount, locale);
  const items = buildDashboardNavItems({
    dict,
    locale,
    websiteHref,
    freshOrders,
  });

  return (
    <>
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
    </>
  );
}

async function HeaderUsage({
  workspaceId,
  plan,
  locale,
  workspaceName,
}: {
  workspaceId: string;
  plan: "free" | "pro";
  locale: "fa" | "en";
  workspaceName: string;
}) {
  const { siteCount } = await getCachedNavMetrics(workspaceId);
  const usage = planUsageLabel(plan, siteCount, locale);
  return (
    <p className="hidden truncate text-sm text-muted-foreground md:block">
      <span className="font-medium text-ink">{workspaceName}</span>
      <span className="mx-2 text-border">·</span>
      {usage}
    </p>
  );
}

async function HeaderSiteSwitcherSlot({
  workspaceId,
  locale,
  primarySiteId,
}: {
  workspaceId: string;
  locale: "fa" | "en";
  primarySiteId: string | null;
}) {
  const websites = await getWorkspaceWebsites(workspaceId);
  const { website } = resolveWorkspaceWebsite(websites, {
    primaryId: primarySiteId,
  });
  const sites = websites.map((site) => ({
    id: site.id,
    name: site.config.brand.name,
    slug: site.slug,
    logo: siteLogoUrl(site),
    status: site.status,
    isPrimary:
      site.id === primarySiteId ||
      (!primarySiteId && site.id === websites[0]?.id),
  }));

  return (
    <SiteSwitcher
      locale={locale}
      sites={sites}
      selectedId={website?.id ?? primarySiteId}
    />
  );
}

async function HeaderToolsSlot({
  workspaceId,
  locale,
  primarySiteId,
}: {
  workspaceId: string;
  locale: "fa" | "en";
  primarySiteId: string | null;
}) {
  const [websites, orders] = await Promise.all([
    getWorkspaceWebsites(workspaceId),
    getWorkspaceOrders(workspaceId, 8),
  ]);
  const { website } = resolveWorkspaceWebsite(websites, {
    primaryId: primarySiteId,
  });
  const notifications = buildActivityFeed({
    locale,
    jobs: [],
    websites,
    primaryWebsite: website,
    freshOrders: orders,
  });

  return (
    <DashboardHeaderTools
      locale={locale}
      workspaceId={workspaceId}
      websiteId={website?.id ?? primarySiteId}
      notifications={notifications}
    />
  );
}

async function MobileNavWithBadge({
  workspaceId,
  locale,
}: {
  workspaceId: string;
  locale: "fa" | "en";
}) {
  const { freshOrders } = await getCachedNavMetrics(workspaceId);
  return <MobileDashboardTabBar locale={locale} freshOrders={freshOrders} />;
}

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
  const primarySiteId = await getPrimarySiteIdCookie();
  const isFa = locale === "fa";
  const websiteHref = primarySiteId
    ? `dashboard/website?id=${primarySiteId}`
    : "dashboard/website";

  const pendingItems = buildDashboardNavItems({
    dict,
    locale,
    websiteHref,
    freshOrders: 0,
  });

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

      <aside className="relative z-[1] hidden border-border/80 bg-white/90 backdrop-blur-xl md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-e">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border/80 px-5">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2.5">
            <LogoMark className="size-6" />
            <span className="text-sm font-semibold tracking-tight">{dict.brand}</span>
          </Link>
          <StatusBadge tone="accent">{planLabel}</StatusBadge>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Suspense
            fallback={
              <>
                <DashboardNav
                  locale={locale}
                  items={pendingItems}
                  groupLabels={{
                    main: dict.dashboard.navMain,
                    growth: dict.dashboard.navGrowth,
                    account: dict.dashboard.navAccount,
                  }}
                />
                <p className="px-6 pb-4 text-[11px] text-muted-foreground">
                  …
                </p>
              </>
            }
          >
            <NavWithMetrics
              workspaceId={session.workspace.id}
              plan={session.workspace.plan}
              locale={locale}
              dict={dict}
              websiteHref={websiteHref}
            />
          </Suspense>
        </div>

        <div className="border-t border-border/80 p-3">
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

      <div className="relative z-[1] min-w-0 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/80 bg-white/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Link
              href={`/${locale}`}
              className="inline-flex shrink-0 items-center gap-2 md:hidden"
              aria-label={dict.brand}
            >
              <LogoMark className="size-6" />
            </Link>
            <Suspense
              fallback={
                <div className="h-9 w-36 animate-pulse rounded-xl bg-muted/80" />
              }
            >
              <HeaderSiteSwitcherSlot
                workspaceId={session.workspace.id}
                locale={locale}
                primarySiteId={primarySiteId}
              />
            </Suspense>
            <div className="hidden min-w-0 md:block">
              <Suspense
                fallback={
                  <p className="truncate text-sm text-muted-foreground">
                    <span className="font-medium text-ink">
                      {session.workspace.name}
                    </span>
                  </p>
                }
              >
                <HeaderUsage
                  workspaceId={session.workspace.id}
                  plan={session.workspace.plan}
                  locale={locale}
                  workspaceName={session.workspace.name}
                />
              </Suspense>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Suspense fallback={null}>
              <HeaderToolsSlot
                workspaceId={session.workspace.id}
                locale={locale}
                primarySiteId={primarySiteId}
              />
            </Suspense>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="size-9 shrink-0 px-0 sm:hidden"
            >
              <Link
                href={`/${locale}/dashboard/import`}
                prefetch
                aria-label={dict.dashboard.refreshImport}
              >
                <Sparkles className="size-3.5" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
            >
              <Link href={`/${locale}/dashboard/import`} prefetch>
                <Sparkles className="size-3.5" aria-hidden />
                <span className="hidden lg:inline">
                  {dict.dashboard.refreshImport}
                </span>
                <span className="lg:hidden">{isFa ? "ورود" : "Import"}</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/${locale}/create`}>
                <Plus className="size-3.5" aria-hidden />
                <span className="hidden min-[420px]:inline">
                  {dict.dashboard.newSite}
                </span>
                <span className="min-[420px]:hidden">
                  {isFa ? "جدید" : "New"}
                </span>
              </Link>
            </Button>
          </div>
        </header>
        <div className="p-3 sm:p-4 md:p-8">{children}</div>
      </div>

      <Suspense
        fallback={<MobileDashboardTabBar locale={locale} freshOrders={0} />}
      >
        <MobileNavWithBadge
          workspaceId={session.workspace.id}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}
