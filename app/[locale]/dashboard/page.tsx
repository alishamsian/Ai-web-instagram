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
  getActiveImportJob,
  getCachedOverviewMetrics,
  getWorkspaceDashboardData,
  planUsageLabel,
} from "@/lib/dashboard/data";
import {
  buildActivityFeed,
  buildNextActions,
  buildOnboardingThree,
  buildSiteHealth,
  buildSmartSuggestion,
} from "@/lib/dashboard/ops";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import { getDomainsForWebsite } from "@/lib/database/queries";
import { getWorkspaceNotificationSettings } from "@/lib/orders/notify";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { getRuntimeMode } from "@/lib/config/env";
import { isProPlan } from "@/lib/config/plans";
import { channelsFromWorkspace } from "@/lib/publishing/repository";
import { Button } from "@/components/ui/button";
import { BuildingSitePlaceholder } from "@/components/dashboard/BuildingSitePlaceholder";
import { JobProgressBanner } from "@/components/dashboard/JobProgressBanner";
import { OrdersPanel } from "@/components/dashboard/OrdersPanel";
import { PrimarySiteCard } from "@/components/dashboard/PrimarySiteCard";
import { ProUpgradeCard } from "@/components/dashboard/ProUpgradeCard";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { SitePhonePreview } from "@/components/dashboard/SitePhonePreview";
import {
  ActivityFeed,
  NextActionsPanel,
  OnboardingRail,
  SiteHealthCard,
  SmartSuggestionCard,
} from "@/components/dashboard/OverviewWidgets";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SectionLabel,
  SoftBanner,
  StatCard,
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
  const [{ websites, imports, jobs }, notificationsSettings] =
    await Promise.all([
      getWorkspaceDashboardData(workspaceId),
      getWorkspaceNotificationSettings(workspaceId),
    ]);

  const { website } = resolveWorkspaceWebsite(websites, { primaryId });
  const otherSites = websites.filter((site) => site.id !== website?.id);
  const websiteIds = websites.map((site) => site.id);
  const { analytics, orderCount, visitCounts, orders } =
    await getCachedOverviewMetrics(workspaceId, websiteIds);

  const domains = website ? await getDomainsForWebsite(website.id) : [];
  const channels = channelsFromWorkspace({
    websites,
    imports,
    locale,
    telegramChatId: notificationsSettings.telegramEnabled
      ? notificationsSettings.telegramChatId
      : null,
  });

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

  const freshNewOrders = orders.filter((o) => o.status === "new").length;
  const hasConnectedChannel = channels.some(
    (c) =>
      (c.type === "telegram" || c.type === "website" || c.type === "instagram") &&
      c.status === "connected",
  );

  const productsMissingPrice = websites.reduce((sum, site) => {
    const items = site.config.content.products?.items ?? [];
    return sum + items.filter((p) => !p.hidden && p.price == null).length;
  }, 0);

  const nextActions = buildNextActions({
    locale,
    website,
    freshNewOrders,
    productsCount,
    productsMissingPrice,
    hasImport: imports.length > 0,
    channels,
    unpublishedContentHint: postsCount > 0,
  });

  const onboarding = buildOnboardingThree({
    hasImport: imports.length > 0,
    website,
    hasConnectedChannel,
  });

  const health = website
    ? buildSiteHealth({
        website,
        hasProducts: productsCount > 0,
        hasDomain: domains.length > 0,
        lastSyncAt: imports[0]?.updatedAt,
        locale,
      })
    : [];

  const suggestion = buildSmartSuggestion({ imports, website, channels });
  const activity = buildActivityFeed({
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

      {!isEmpty ? (
        <OnboardingRail
          locale={locale}
          workspaceId={workspaceId}
          steps={onboarding}
        />
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
            hint={
              freshNewOrders > 0
                ? isFa
                  ? `${freshNewOrders} جدید`
                  : `${freshNewOrders} new`
                : isFa
                  ? "کل ثبت‌شده‌ها"
                  : "All time"
            }
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
          steps={[
            {
              label: isFa ? "لینک اینستاگرام را بده" : "Paste your Instagram",
              href: `/${locale}/create`,
            },
            {
              label: isFa ? "سایت را بررسی و منتشر کن" : "Review and publish",
            },
            {
              label: isFa ? "یک کانال برای بازنشر وصل کن" : "Connect a channel",
            },
          ]}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-6">
            <NextActionsPanel locale={locale} actions={nextActions} />

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

            {website ? (
              <div className="xl:hidden">
                <SitePhonePreview site={website} locale={locale} />
              </div>
            ) : null}

            <SmartSuggestionCard locale={locale} suggestion={suggestion} />

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

            <ActivityFeed locale={locale} items={activity} />
          </div>

          <div className="space-y-4">
            {website ? (
              <div className="hidden xl:block">
                <SitePhonePreview site={website} locale={locale} />
              </div>
            ) : null}

            {website && health.length > 0 ? (
              <SiteHealthCard
                locale={locale}
                items={health}
                brandName={website.config.brand.name}
              />
            ) : null}

            {!isPro ? <ProUpgradeCard locale={locale} feature="generic" /> : null}

            <OrdersPanel
              orders={orders}
              locale={locale}
              whatsappBySite={whatsappBySite}
              brandNameBySite={
                new Map(
                  websites.map((site) => [site.id, site.config.brand.name]),
                )
              }
              siteHref={
                website
                  ? `/${locale}/dashboard/website?id=${website.id}`
                  : undefined
              }
              contentHref={
                website
                  ? `/${locale}/dashboard/content?id=${website.id}`
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </PageStack>
  );
}
