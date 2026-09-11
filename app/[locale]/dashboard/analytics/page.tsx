import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Eye, MousePointerClick, Share2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  getWorkspaceAnalytics,
  getWorkspaceDashboardData,
} from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  PageStack,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui";

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

  const { websites } = await getWorkspaceDashboardData(session.workspace.id);
  const published = websites.filter((site) => site.status === "published");
  const analytics = await getWorkspaceAnalytics(
    published.map((s) => s.id),
    14,
  );
  const maxBar = Math.max(1, ...analytics.series.map((s) => s.count));
  const sortedSeries = [...analytics.series].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

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
          action={
            websites[0] ? (
              <Button asChild>
                <Link href={`/${locale}/dashboard/website?id=${websites[0].id}`}>
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
              value={String(analytics.byPath.length)}
              hint={isFa ? "مسیرهای دیده‌شده" : "Paths seen"}
              icon={<Share2 className="size-4" aria-hidden />}
            />
            <StatCard
              label={dict.dashboard.analyticsTopPages}
              value={String(published.length)}
              hint={dict.dashboard.statsHintPublished}
              icon={<MousePointerClick className="size-4" aria-hidden />}
            />
            <StatCard
              label={dict.dashboard.plan}
              value={
                session.workspace.plan === "pro"
                  ? "Pro"
                  : isFa
                    ? "شروع"
                    : "Starter"
              }
              icon={<BarChart3 className="size-4" aria-hidden />}
            />
          </div>

          <Panel
            title={dict.dashboard.analyticsVisits}
            description={isFa ? "روند بازدید روزانه" : "Daily visit trend"}
            action={
              <StatusBadge tone="accent">
                {isFa ? "زنده" : "Live"}
              </StatusBadge>
            }
          >
            <div className="px-5 py-8">
              {sortedSeries.length ? (
                <div className="flex h-44 items-end gap-1.5 sm:gap-2">
                  {sortedSeries.map((point) => (
                    <div
                      key={point.date}
                      className="group relative flex-1 rounded-t-md bg-gradient-to-t from-ink/20 to-ink/55 transition-[height] hover:to-ink/70"
                      title={`${point.date}: ${point.count}`}
                      style={{
                        height: `${Math.max(10, (point.count / maxBar) * 100)}%`,
                      }}
                    >
                      <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                        {point.count}
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
                      className="flex items-center justify-between gap-3 rounded-xl bg-[#fafafa] px-3 py-2.5"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
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
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {site.config.brand.name}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      /s/{site.slug}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
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
