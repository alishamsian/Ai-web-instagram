import {
  EmptyState,
  PageHeader,
  PageStack,
  Panel,
  SoftBanner,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui";
import { buildAnalyticsInsights } from "@/lib/dashboard/analytics-insights";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Eye, MousePointerClick, Package, Share2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  getWorkspaceAnalytics,
  getWorkspaceWebsites,
} from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const isFa = locale === "fa";

  const websites = await getWorkspaceWebsites(session.workspace.id);
  const published = websites.filter((site) => site.status === "published");
  const analytics = await getWorkspaceAnalytics(
    published.map((s) => s.id),
    14,
  );
  const maxBar = Math.max(1, ...analytics.series.map((s) => s.count));
  const sortedSeries = [...analytics.series].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const topProducts = analytics.byPath
    .filter((row) => row.path.startsWith("/p/"))
    .slice(0, 6);
  const primary = published[0] ?? websites[0] ?? null;
  const insights = buildAnalyticsInsights({
    total: analytics.total,
    series: analytics.series,
    byReferrer: analytics.byReferrer,
    topProductViews: topProducts.reduce((s, r) => s + r.count, 0),
    publishedCount: published.length,
    locale,
  });

  return (
    <PageStack>
      <PageHeader
        eyebrow={dict.dashboard.navGrowth}
        title={dict.dashboard.analyticsTitle}
        description={dict.dashboard.analyticsBody}
      />

      {published.length === 0 ? (
        <EmptyState
          title={dict.dashboard.analyticsEmpty}
          body={dict.dashboard.analyticsEmptyBody}
          icon={<BarChart3 className="size-5" aria-hidden />}
          steps={[
            {
              label: isFa ? "فروشگاه را منتشر کن" : "Publish your store",
              href: primary
                ? `/${locale}/dashboard/website?id=${primary.id}`
                : `/${locale}/create`,
              done: false,
            },
            {
              label: isFa
                ? "لینک بیو را در اینستاگرام بگذار"
                : "Share the bio link on Instagram",
              href: primary
                ? `/${locale}/dashboard/website?id=${primary.id}`
                : undefined,
              done: false,
            },
            {
              label: isFa
                ? "بازدیدها اینجا ظاهر می‌شوند"
                : "Visits will show up here",
              done: false,
            },
          ]}
          action={
            primary ? (
              <Button asChild>
                <Link href={`/${locale}/dashboard/website?id=${primary.id}`}>
                  {dict.dashboard.publish}
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
              </Button>
            )
          }
        />
      ) : analytics.total === 0 ? (
        <EmptyState
          title={
            isFa ? "هنوز بازدیدی نیست" : "No visits yet"
          }
          body={
            isFa
              ? "سایت منتشر شده — لینک بیو را به اشتراک بگذار تا آمار جمع شود."
              : "Your site is live — share the bio link to start collecting stats."
          }
          icon={<BarChart3 className="size-5" aria-hidden />}
          steps={[
            {
              label: isFa ? "سایت منتشر شده" : "Site published",
              done: true,
            },
            {
              label: isFa
                ? "کپی لینک بیو و گذاشتن در اینستاگرام"
                : "Copy bio link into Instagram",
              href: primary
                ? `/${locale}/dashboard/website?id=${primary.id}`
                : undefined,
            },
            {
              label: isFa ? "QR را در استوری بگذار" : "Post the QR in a story",
              href: primary
                ? `/${locale}/dashboard/website?id=${primary.id}`
                : undefined,
            },
          ]}
          action={
            primary ? (
              <Button asChild>
                <Link href={`/${locale}/dashboard/website?id=${primary.id}`}>
                  {isFa ? "رفتن به لینک بیو" : "Open bio tools"}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={dict.dashboard.analyticsVisits}
              value={String(analytics.total)}
              hint={isFa ? "۱۴ روز اخیر" : "Last 14 days"}
              icon={<Eye className="size-4" aria-hidden />}
            />
            <StatCard
              label={dict.dashboard.analyticsSources}
              value={String(analytics.byReferrer.length)}
              hint={isFa ? "منابع ترافیک" : "Traffic sources"}
              icon={<Share2 className="size-4" aria-hidden />}
            />
            <StatCard
              label={isFa ? "محصولات برتر" : "Top products"}
              value={String(topProducts.length)}
              hint={isFa ? "مسیرهای /p/" : "/p/ paths"}
              icon={<Package className="size-4" aria-hidden />}
            />
            <StatCard
              label={dict.dashboard.analyticsTopPages}
              value={String(published.length)}
              hint={dict.dashboard.statsHintPublished}
              icon={<MousePointerClick className="size-4" aria-hidden />}
            />
          </div>

          {insights.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {insights.map((insight) => (
                <SoftBanner
                  key={insight.id}
                  tone={
                    insight.tone === "positive"
                      ? "success"
                      : insight.tone === "action"
                        ? "warning"
                        : "info"
                  }
                >
                  <p className="font-medium text-ink">
                    {isFa ? insight.titleFa : insight.titleEn}
                  </p>
                  <p className="mt-1 text-[13px] leading-5">
                    {isFa ? insight.bodyFa : insight.bodyEn}
                  </p>
                  {insight.href && primary ? (
                    <Link
                      href={`/${locale}/${insight.href}${insight.href.includes("website") ? `?id=${primary.id}` : ""}`}
                      className="mt-2 inline-flex text-xs font-medium underline-offset-2 hover:underline"
                    >
                      {isFa ? "ادامه" : "Open"} →
                    </Link>
                  ) : null}
                </SoftBanner>
              ))}
            </div>
          ) : null}

          <Panel
            title={dict.dashboard.analyticsVisits}
            description={isFa ? "روند بازدید روزانه" : "Daily visit trend"}
            action={
              <StatusBadge tone="accent">
                {isFa ? "زنده" : "Live"}
              </StatusBadge>
            }
          >
            <div className="px-3 py-6 sm:px-5 sm:py-8">
              {sortedSeries.length ? (
                <div className="flex h-48 items-stretch gap-1 sm:h-52 sm:gap-2">
                  {sortedSeries.map((point) => (
                    <div
                      key={point.date}
                      className="group relative flex min-w-0 flex-1 flex-col"
                    >
                      <div className="relative flex min-h-0 flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-ink/20 to-ink/55 transition-[height] hover:to-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                          title={`${point.date}: ${point.count}`}
                          style={{
                            height: `${Math.max(10, (point.count / maxBar) * 100)}%`,
                          }}
                          tabIndex={0}
                          aria-label={`${point.date}: ${point.count}`}
                        />
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-[1] hidden -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block group-focus-within:block">
                          {point.count}
                        </span>
                      </div>
                      <span className="mt-1.5 shrink-0 truncate text-center font-mono text-[9px] text-muted-foreground sm:text-[10px]">
                        {point.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {isFa
                    ? "هنوز بازدیدی ثبت نشده. سایت منتشرشده را باز کنید."
                    : "No views yet. Open your published site to start collecting."}
                </p>
              )}
              {analytics.byPath.length ? (
                <ul className="mt-8 space-y-2.5 border-t border-border pt-6 text-sm">
                  {analytics.byPath.map((row) => (
                    <li
                      key={row.path}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-[#fafafa] px-3 py-2.5"
                    >
                      <span className="truncate font-mono text-[11px] text-muted-foreground sm:text-xs">
                        {row.path}
                      </span>
                      <span className="tabular-nums font-medium text-ink">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>

          {topProducts.length ? (
            <Panel
              title={isFa ? "محصولات برتر" : "Top products"}
              description={
                isFa
                  ? "بازدید صفحات محصول (/p/)"
                  : "Product page views (/p/)"
              }
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${locale}/dashboard/content`}>
                    {dict.dashboard.content}
                  </Link>
                </Button>
              }
            >
              <ul className="divide-y divide-border">
                {topProducts.map((row) => (
                  <li key={row.path}>
                    <Link
                      href={`/${locale}/dashboard/content`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-[#fafafa]"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.path}
                      </span>
                      <span className="tabular-nums font-medium text-ink">
                        {row.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {analytics.byReferrer.length ? (
            <Panel
              title={dict.dashboard.analyticsSources}
              description={
                isFa ? "منبع ترافیک (referrer)" : "Traffic sources (referrer)"
              }
            >
              <ul className="divide-y divide-border">
                {analytics.byReferrer.map((row) => (
                  <li
                    key={row.source}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
                  >
                    <span className="capitalize text-ink">{row.source}</span>
                    <span className="tabular-nums font-medium text-ink">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title={dict.dashboard.sitesTitle}>
            <ul className="divide-y divide-border">
              {published.map((site) => (
                <li
                  key={site.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {site.config.brand.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      /s/{site.slug}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                    <Link href={`/${locale}/dashboard/website?id=${site.id}`}>
                      {dict.dashboard.openSite}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </PageStack>
  );
}
