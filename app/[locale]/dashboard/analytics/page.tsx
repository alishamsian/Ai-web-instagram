import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Eye, MousePointerClick, Share2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui";

async function loadAnalytics(websiteIds: string[], days = 14) {
  if (!websiteIds.length) {
    return { total: 0, series: [] as { date: string; count: number }[], byPath: [] as { path: string; count: number }[] };
  }
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return { total: 0, series: [], byPath: [] };
  }
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("page_views")
    .select("path, created_at")
    .in("website_id", websiteIds)
    .gte("created_at", since)
    .limit(20_000);
  const rows = data ?? [];
  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const path = (row.path as string) || "/";
    byPath.set(path, (byPath.get(path) ?? 0) + 1);
  }
  return {
    total: rows.length,
    series: [...byDay.entries()].map(([date, count]) => ({ date, count })),
    byPath: [...byPath.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { websites } = await getWorkspaceDashboardData(session.workspace.id);
  const published = websites.filter((site) => site.status === "published");
  const analytics = await loadAnalytics(published.map((s) => s.id));
  const maxBar = Math.max(1, ...analytics.series.map((s) => s.count));

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navGrowth}
        title={dict.dashboard.analyticsTitle}
        description={dict.dashboard.analyticsBody}
      />

      {published.length === 0 ? (
        <EmptyState
          title={dict.dashboard.analyticsEmpty}
          body={dict.dashboard.analyticsEmptyBody}
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
              hint={locale === "fa" ? "۱۴ روز اخیر" : "Last 14 days"}
              icon={<Eye className="size-4" aria-hidden />}
            />
            <StatCard
              label={dict.dashboard.analyticsSources}
              value={String(analytics.byPath.length)}
              hint={locale === "fa" ? "مسیرهای دیده‌شده" : "Paths seen"}
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
                  : locale === "fa"
                    ? "شروع"
                    : "Starter"
              }
              icon={<BarChart3 className="size-4" aria-hidden />}
            />
          </div>

          <Panel
            title={dict.dashboard.analyticsVisits}
            action={
              <StatusBadge tone="accent">
                {locale === "fa" ? "زنده" : "Live"}
              </StatusBadge>
            }
          >
            <div className="px-5 py-10">
              {analytics.series.length ? (
                <div className="flex h-40 items-end gap-2">
                  {analytics.series.map((point) => (
                    <div
                      key={point.date}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-ink/15 to-ink/45"
                      title={`${point.date}: ${point.count}`}
                      style={{
                        height: `${Math.max(8, (point.count / maxBar) * 100)}%`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {locale === "fa"
                    ? "هنوز بازدیدی ثبت نشده. سایت منتشرشده را باز کنید."
                    : "No views yet. Open your published site to start collecting."}
                </p>
              )}
              {analytics.byPath.length ? (
                <ul className="mt-6 space-y-2 text-sm">
                  {analytics.byPath.map((row) => (
                    <li
                      key={row.path}
                      className="flex justify-between gap-3 text-muted-foreground"
                    >
                      <span className="font-mono text-xs">{row.path}</span>
                      <span>{row.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>

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
    </div>
  );
}
