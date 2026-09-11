import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Eye,
  FolderOpen,
  Images,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  buildNotifications,
  buildSetupChecklist,
  formatRelativeTime,
  getActiveImportJob,
  getCachedOverviewMetrics,
  getWorkspaceDashboardData,
  planUsageLabel,
} from "@/lib/dashboard/data";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { getRuntimeMode } from "@/lib/config/env";
import { isProPlan } from "@/lib/config/plans";
import { Button } from "@/components/ui/button";
import { BuildingSitePlaceholder } from "@/components/dashboard/BuildingSitePlaceholder";
import { JobProgressBanner } from "@/components/dashboard/JobProgressBanner";
import { OrdersPanel } from "@/components/dashboard/OrdersPanel";
import { PrimarySiteCard } from "@/components/dashboard/PrimarySiteCard";
import { ProUpgradeCard } from "@/components/dashboard/ProUpgradeCard";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { SitePhonePreview } from "@/components/dashboard/SitePhonePreview";
import {
  EmptyState,
  PageHeader,
  PageStack,
  Panel,
  SectionLabel,
  SoftBanner,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const workspaceId = session.workspace.id;
  const primaryId = await getPrimarySiteIdCookie();
  const { websites, imports, jobs } =
    await getWorkspaceDashboardData(workspaceId);

  const { website } = resolveWorkspaceWebsite(websites, { primaryId });
  const otherSites = websites.filter((site) => site.id !== website?.id);
  const websiteIds = websites.map((site) => site.id);
  const { analytics, orderCount, visitCounts, orders } =
    await getCachedOverviewMetrics(workspaceId, websiteIds);

  const activeJob = getActiveImportJob(jobs);
  const mode = getRuntimeMode();
  const isMock = mode.collector === "mock";
  const isPro = isProPlan(session.workspace.plan);
  const isFa = locale === "fa";
  const primaryVisits = website ? (visitCounts.get(website.id) ?? 0) : 0;

  const productsCount = websites.reduce(
    (sum, site) => sum + (site.config.content.products?.items.length ?? 0),
    0,
  );
  const postsCount = imports.reduce(
    (sum, item) => sum + item.posts.length + item.reels.length,
    0,
  );

  const checklist = buildSetupChecklist({
    locale,
    website,
    hasImport: imports.length > 0,
    hasProducts: productsCount > 0,
    visits: primaryVisits || analytics.total,
  });
  const notifications = buildNotifications({
    locale,
    jobs,
    websites,
    primaryWebsite: website,
    freshOrders: orders,
  });

  const whatsappBySite = new Map(
    websites.map((site) => [
      site.id,
      site.config.content.contact?.info?.whatsapp ?? null,
    ]),
  );

  const isEmpty = websites.length === 0 && !activeJob;
  const showStats = !isEmpty;

  return (
    <PageStack>
      {isMock ? <SoftBanner>{dict.dashboard.mockBanner}</SoftBanner> : null}

      {activeJob && website ? (
        <JobProgressBanner job={activeJob} locale={locale} />
      ) : null}

      <PageHeader
        eyebrow={dict.dashboard.overviewEyebrow}
        title={dict.dashboard.title}
        description={
          isFa
            ? "وضعیت سایت و گام بعدی — یک نگاه."
            : "Site status and your next step — at a glance."
        }
        actions={
          isEmpty ? (
            <Button asChild size="sm">
              <Link href={`/${locale}/create`}>
                <Sparkles className="size-3.5" aria-hidden />
                {dict.dashboard.emptyCta}
              </Link>
            </Button>
          ) : website ? (
            <Button asChild size="sm">
              <Link href={`/${locale}/editor/${website.id}`}>
                {dict.dashboard.edit}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          )
        }
      />

      {!isEmpty && checklist.some((s) => !s.done) ? (
        <div className="xl:hidden">
          <SetupChecklist steps={checklist} locale={locale} />
        </div>
      ) : null}

      {showStats ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label={dict.dashboard.statsSites}
            value={String(websites.length)}
            hint={planUsageLabel(
              session.workspace.plan,
              websites.length,
              locale,
            )}
            icon={<FolderOpen className="size-4" aria-hidden />}
          />
          <StatCard
            label={dict.dashboard.analyticsVisits}
            value={String(analytics.total)}
            hint={isFa ? "۱۴ روز · همه سایت‌ها" : "14d · all sites"}
            icon={<Eye className="size-4" aria-hidden />}
          />
          <StatCard
            label={isFa ? "سفارش‌ها" : "Orders"}
            value={String(orderCount)}
            hint={isFa ? "کل ثبت‌شده‌ها" : "All time"}
            icon={<ShoppingBag className="size-4" aria-hidden />}
          />
          <StatCard
            label={dict.dashboard.products}
            value={String(productsCount)}
            hint={
              isFa
                ? `${postsCount} پست واردشده`
                : `${postsCount} imported posts`
            }
            icon={<Images className="size-4" aria-hidden />}
          />
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState
          title={dict.dashboard.empty}
          body={dict.dashboard.emptyBody}
          icon={<Sparkles className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            {website ? (
              <PrimarySiteCard
                site={website}
                username={
                  imports.find((item) => item.id === website.importId)
                    ?.username
                }
                locale={locale}
                dict={dict}
                isPro={isPro}
                visits={primaryVisits}
              />
            ) : activeJob ? (
              <BuildingSitePlaceholder job={activeJob} locale={locale} />
            ) : null}

            {otherSites.length > 0 ? (
              <div className="space-y-3">
                <SectionLabel>{dict.dashboard.sitesTitle}</SectionLabel>
                <div className="grid gap-4 sm:grid-cols-2">
                  {otherSites.map((site) => {
                    const imported = imports.find(
                      (item) => item.id === site.importId,
                    );
                    return (
                      <SiteCard
                        key={site.id}
                        site={site}
                        username={imported?.username}
                        locale={locale}
                        dict={dict}
                        visits={visitCounts.get(site.id) ?? 0}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {website ? <SitePhonePreview site={website} locale={locale} /> : null}

            <div className="hidden xl:block">
              <SetupChecklist steps={checklist} locale={locale} />
            </div>
            {checklist.every((s) => s.done) ? (
              <div className="xl:hidden">
                <SetupChecklist steps={checklist} locale={locale} />
              </div>
            ) : null}

            {!isPro ? <ProUpgradeCard locale={locale} feature="generic" /> : null}

            <OrdersPanel
              orders={orders}
              locale={locale}
              whatsappBySite={whatsappBySite}
              siteHref={
                website
                  ? `/${locale}/dashboard/website?id=${website.id}`
                  : undefined
              }
            />

            <Panel
              title={isFa ? "اعلان‌ها" : "Notifications"}
              description={
                isFa ? "رویدادهای مهم اخیر" : "Recent important events"
              }
            >
              {notifications.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {dict.dashboard.noActivity}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/${locale}/${item.href}`}
                        className="flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-ink">
                              {item.title}
                            </p>
                            <StatusBadge tone={item.tone}>
                              {formatRelativeTime(item.at, locale)}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </PageStack>
  );
}
