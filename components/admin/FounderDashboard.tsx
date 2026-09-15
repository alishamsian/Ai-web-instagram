import type {
  AIMetrics,
  ActivityItem,
  AlertSummary,
  DashboardKpis,
  ImportMetrics,
  SystemHealthMetrics,
} from "@/lib/admin/contracts";
import type { MetricSeriesResult } from "@/lib/admin/queries";
import type {
  InfrastructureOverview,
  ObservabilityEvent,
} from "@/lib/admin/phase4-contracts";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLineChart } from "@/components/admin/AdminChart";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { AdminSystemHealthGrid } from "@/components/admin/AdminSystemHealth";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
import { adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";
import { roleHasPermission, type AdminRole } from "@/lib/admin/permissions";
import Link from "next/link";
import { relativeTime } from "@/components/admin/format";

export function FounderDashboard({
  locale,
  role,
  kpis,
  ai,
  imports,
  health,
  alerts,
  activity,
  series,
  infra,
  timeline,
}: {
  locale: Locale;
  role: AdminRole;
  kpis: DashboardKpis;
  ai: AIMetrics;
  imports: ImportMetrics;
  health: SystemHealthMetrics;
  alerts: AlertSummary[];
  activity: ActivityItem[];
  series: {
    users: MetricSeriesResult;
    websites: MetricSeriesResult;
    published: MetricSeriesResult;
    ai: MetricSeriesResult;
    imports: MetricSeriesResult;
  };
  infra?: InfrastructureOverview | null;
  timeline?: ObservabilityEvent[];
}) {
  const isFa = locale === "fa";
  const canManage = roleHasPermission(role, "system.manage");

  const successRate =
    imports.successRate.status === "available"
      ? imports.successRate
      : undefined;

  const statusTone =
    infra?.systemStatus === "critical"
      ? "danger"
      : infra?.systemStatus === "degraded"
        ? "warning"
        : infra?.systemStatus === "healthy"
          ? "success"
          : "neutral";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={isFa ? "مرکز فرمان" : "Command Center"}
        title={isFa ? "داشبورد بنیان‌گذار" : "Founder Command Center"}
        description={
          isFa
            ? "متریک‌های واقعی از لایهٔ Admin Query — بدون عدد جعلی."
            : "Real metrics from the Admin query layer — never invented."
        }
      />

      {infra ? (
        <AdminSection
          title={isFa ? "وضعیت سیستم" : "System Status"}
          description={infra.systemStatusReason}
        >
          <div className="flex flex-wrap items-center gap-3">
            <AdminStatusBadge tone={statusTone}>
              {infra.systemStatus}
            </AdminStatusBadge>
            <Link
              href={adminHref(locale, "/ops")}
              className="text-xs text-[var(--admin-muted)] underline-offset-2 hover:underline"
              prefetch={false}
            >
              {isFa ? "نمای عملیات" : "Operations overview"}
            </Link>
          </div>
        </AdminSection>
      ) : null}

      <AdminSection
        title={isFa ? "شاخص‌های اصلی" : "Primary KPIs"}
        description={isFa ? "مقایسه با دوره قبل" : "Compared to previous period"}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "کاربران جدید" : "New Users"}
            comparable={kpis.newUsers}
            sparkline={series.users.points.map((p) => p.value)}
            href={adminHref(locale, "/users")}
          />
          <AdminMetricCard
            label={isFa ? "سایت ساخته‌شده" : "Websites Created"}
            comparable={kpis.websitesCreated}
            sparkline={series.websites.points.map((p) => p.value)}
            href={adminHref(locale, "/websites")}
          />
          <AdminMetricCard
            label={isFa ? "سایت منتشرشده" : "Published Websites"}
            comparable={kpis.websitesPublished}
            sparkline={series.published.points.map((p) => p.value)}
            href={adminHref(locale, "/websites")}
          />
          <AdminMetricCard
            label={isFa ? "درخواست‌های AI" : "AI Requests"}
            comparable={kpis.aiRequests}
            sparkline={series.ai.points.map((p) => p.value)}
            href={adminHref(locale, "/ai")}
          />
        </div>
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title={isFa ? "هوش مصنوعی" : "AI"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminMetricCard
              label={isFa ? "درخواست‌ها" : "Requests"}
              comparable={ai.requests}
              href={adminHref(locale, "/ai")}
            />
            <AdminMetricCard
              label={isFa ? "کامل‌شده" : "Completed"}
              metric={ai.completed}
            />
            <AdminMetricCard
              label={isFa ? "ناموفق" : "Failed"}
              metric={ai.failed}
              href={adminHref(locale, "/ai/failures")}
            />
            <AdminMetricCard
              label={isFa ? "هزینه تخمینی" : "Estimated Cost"}
              comparable={ai.estimatedCost}
              style="currency"
              href={adminHref(locale, "/ai/costs")}
            />
            <AdminMetricCard
              label={isFa ? "میانگین تأخیر" : "Avg Latency"}
              metric={ai.avgLatencyMs}
              href={adminHref(locale, "/ai/latency")}
            />
          </div>
        </AdminSection>

        <AdminSection title={isFa ? "زیرساخت" : "Infrastructure"}>
          {infra ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
                <p className="text-[11px] text-[var(--admin-muted)]">
                  {isFa ? "جاب‌های ناموفق" : "Failed jobs"}
                </p>
                <p className="mt-2 font-display text-2xl tabular-nums">
                  <MetricCell metric={infra.failedJobs24h} />
                </p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
                <p className="text-[11px] text-[var(--admin-muted)]">
                  {isFa ? "جاب‌های stale" : "Stale jobs"}
                </p>
                <p className="mt-2 font-display text-2xl tabular-nums">
                  <MetricCell metric={infra.staleJobs} />
                </p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
                <p className="text-[11px] text-[var(--admin-muted)]">
                  {isFa ? "عمق صف" : "Queue depth"}
                </p>
                <p className="mt-2 font-display text-2xl tabular-nums">
                  <MetricCell metric={infra.queueDepth} />
                </p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
                <p className="text-[11px] text-[var(--admin-muted)]">
                  {isFa ? "هشدارهای بحرانی" : "Critical alerts"}
                </p>
                <p className="mt-2 font-display text-2xl tabular-nums">
                  <MetricCell metric={infra.criticalAlerts} />
                </p>
              </div>
            </div>
          ) : (
            <AdminSystemHealthGrid health={health} locale={locale} />
          )}
        </AdminSection>
      </div>

      {infra && infra.attention.length > 0 ? (
        <AdminSection title={isFa ? "نیاز به توجه" : "Attention Required"}>
          <ul className="space-y-2">
            {infra.attention.map((a) => (
              <li key={a.id}>
                <Link
                  href={adminHref(locale, a.href)}
                  prefetch={false}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-4 py-3 text-sm hover:bg-[var(--admin-muted-bg)]/50"
                >
                  <span className="text-[var(--admin-fg)]">{a.title}</span>
                  <AdminStatusBadge
                    tone={
                      a.severity === "critical"
                        ? "danger"
                        : a.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {a.severity}
                  </AdminStatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      ) : null}

      <AdminSection title={isFa ? "شاخص‌های ثانویه" : "Secondary"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "ایمپورت‌ها" : "Imports"}
            comparable={kpis.imports}
            href={adminHref(locale, "/imports")}
          />
          {successRate ? (
            <AdminMetricCard
              label={isFa ? "نرخ موفقیت ایمپورت" : "Import Success Rate"}
              metric={successRate}
              style="percent"
            />
          ) : (
            <AdminMetricCard
              label={isFa ? "نرخ موفقیت ایمپورت" : "Import Success Rate"}
              metric={imports.successRate}
              style="percent"
            />
          )}
          <AdminMetricCard
            label={isFa ? "سفارش‌ها" : "Orders"}
            comparable={kpis.orders}
            href={adminHref(locale, "/orders")}
          />
          <AdminMetricCard
            label={isFa ? "بازدید صفحه" : "Page Views"}
            comparable={kpis.pageViews}
          />
        </div>
      </AdminSection>

      <AdminSection
        title={
          isFa
            ? "در دسترس نیست / نیاز به یکپارچه‌سازی"
            : "Unavailable / needs integration"
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard label="MRR" metric={kpis.mrr} style="currency" />
          <AdminMetricCard
            label={isFa ? "درآمد" : "Revenue"}
            metric={kpis.revenue}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "کاربران فعال" : "Active Users"}
            comparable={kpis.activeUsers}
          />
        </div>
      </AdminSection>

      <AdminSection title={isFa ? "روندها" : "Trends"}>
        <div className="grid gap-3 lg:grid-cols-2">
          <AdminLineChart
            label={isFa ? "رشد کاربران" : "User Growth"}
            points={series.users.points}
            emptyLabel={
              isFa
                ? "هنوز ردیفی در daily_metrics نیست"
                : "No daily_metrics rows yet"
            }
            unavailableReason={
              series.users.status === "unavailable"
                ? series.users.reason
                : undefined
            }
          />
          <AdminLineChart
            label={isFa ? "ساخت سایت" : "Website Creation"}
            points={series.websites.points}
            emptyLabel={
              isFa
                ? "هنوز ردیفی در daily_metrics نیست"
                : "No daily_metrics rows yet"
            }
            unavailableReason={
              series.websites.status === "unavailable"
                ? series.websites.reason
                : undefined
            }
          />
          <AdminLineChart
            label={isFa ? "انتشار سایت" : "Website Publishing"}
            points={series.published.points}
            emptyLabel={
              isFa
                ? "هنوز ردیفی در daily_metrics نیست"
                : "No daily_metrics rows yet"
            }
            unavailableReason={
              series.published.status === "unavailable"
                ? series.published.reason
                : undefined
            }
          />
          <AdminLineChart
            label={isFa ? "مصرف AI" : "AI Usage"}
            points={series.ai.points}
            emptyLabel={
              isFa
                ? "هنوز ردیفی در daily_metrics نیست"
                : "No daily_metrics rows yet"
            }
            unavailableReason={
              series.ai.status === "unavailable" ? series.ai.reason : undefined
            }
          />
          <AdminLineChart
            label={isFa ? "ایمپورت‌ها" : "Imports"}
            points={series.imports.points}
            emptyLabel={
              isFa
                ? "هنوز ردیفی در daily_metrics نیست"
                : "No daily_metrics rows yet"
            }
            unavailableReason={
              series.imports.status === "unavailable"
                ? series.imports.reason
                : undefined
            }
          />
        </div>
      </AdminSection>

      <AdminSection title={isFa ? "سلامت سیستم" : "System Health"}>
        <AdminSystemHealthGrid health={health} locale={locale} />
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title={isFa ? "هشدارها" : "Alerts"}>
          <AdminAlertsPanel
            alerts={alerts}
            locale={locale}
            canManage={canManage}
          />
        </AdminSection>
        <AdminSection title={isFa ? "فعالیت زنده" : "Live Activity"}>
          <AdminActivityFeed items={activity} locale={locale} />
        </AdminSection>
      </div>

      {timeline && timeline.length > 0 ? (
        <AdminSection
          title={isFa ? "جدول زمانی عملیاتی" : "Recent Operational Timeline"}
        >
          <ul className="divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
            {timeline.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-[var(--admin-fg)]">{e.message}</p>
                  <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                    {e.category} · {e.source}
                  </p>
                </div>
                <span className="text-[11px] text-[var(--admin-muted)]">
                  {relativeTime(e.occurredAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        </AdminSection>
      ) : null}
    </div>
  );
}
