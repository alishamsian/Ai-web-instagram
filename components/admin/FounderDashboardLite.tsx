import type { DashboardKpis, MetricResult } from "@/lib/admin/contracts";
import type { InfrastructureOverview } from "@/lib/admin/phase4-contracts";
import type { OpsDashboardSignals } from "@/lib/admin/phase5-contracts";
import type { FounderInsight } from "@/lib/admin/intelligence/founder-insights";
import type { FounderBillingSummary } from "@/lib/admin/phase7-queries";
import { AdminPageHeader, AdminSection, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
import { metricDisplay } from "@/components/admin/format";
import { adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";
import type { AdminRole } from "@/lib/admin/permissions";
import Link from "next/link";

export function FounderDashboardLite({
  locale,
  role,
  kpis,
  infra,
  ops,
  insights,
  atRisk,
  billing,
}: {
  locale: Locale;
  role: AdminRole;
  kpis: DashboardKpis;
  infra: InfrastructureOverview;
  ops?: OpsDashboardSignals;
  insights?: FounderInsight[];
  atRisk?: MetricResult<number>;
  billing?: FounderBillingSummary;
}) {
  void role;
  const isFa = locale === "fa";
  const atRiskDisplay = atRisk ? metricDisplay(atRisk) : null;
  const tone =
    infra.systemStatus === "critical"
      ? "danger"
      : infra.systemStatus === "degraded"
        ? "warning"
        : infra.systemStatus === "healthy"
          ? "success"
          : "neutral";
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={isFa ? "مرکز فرمان" : "Command Center"}
        title={isFa ? "داشبورد بنیان‌گذار" : "Founder Command Center"}
        description={
          isFa
            ? "نمای سریع و پایدار؛ تحلیل سنگین در صفحات تخصصی انجام می‌شود."
            : "Fast, resilient overview; deep analysis lives on dedicated pages."
        }
      />

      <AdminSection title={isFa ? "وضعیت سیستم" : "System Status"} description={infra.systemStatusReason}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminStatusBadge tone={tone}>{infra.systemStatus}</AdminStatusBadge>
          <Link href={adminHref(locale, "/ops")} prefetch={false} className="text-xs text-[var(--admin-muted)] hover:underline">
            {isFa ? "نمای عملیات" : "Operations overview"}
          </Link>
        </div>
      </AdminSection>

      {ops ? (
        <AdminSection
          title={isFa ? "سیگنال‌های عملیات و امنیت" : "Ops & security signals"}
          description={isFa ? "فقط head-count — بدون اسکن سنگین" : "Head-counts only — no heavy scans"}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricBox label={isFa ? "حوادث باز" : "Open incidents"} metric={ops.openIncidents} />
            <MetricBox label={isFa ? "گروه خطای بحرانی" : "Critical error groups"} metric={ops.criticalErrorGroups} />
            <MetricBox label={isFa ? "رویداد امنیتی ۲۴س" : "Security events 24h"} metric={ops.securityEvents24h} />
            <MetricBox label={isFa ? "شکست cron ۲۴س" : "Cron failures 24h"} metric={ops.cronFailures24h} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href={adminHref(locale, "/incidents")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "حوادث" : "Incidents"}</Link>
            <Link href={adminHref(locale, "/errors")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "خطاها" : "Errors"}</Link>
            <Link href={adminHref(locale, "/security")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "امنیت" : "Security"}</Link>
          </div>
        </AdminSection>
      ) : null}

      {billing ? (
        <AdminSection
          title={isFa ? "صورتحساب (خلاصه)" : "Billing summary"}
          description={
            isFa
              ? "فقط شاخص‌های سبک — بدون قیف کامل"
              : "Bounded strip only — no full funnel"
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminMetricCard label="MRR" metric={billing.mrr} style="currency" compact />
            <AdminMetricCard
              label={isFa ? "ورک‌اسپیس پولی" : "Paid workspaces"}
              metric={billing.paidWorkspaces}
              compact
            />
            <AdminMetricCard
              label={isFa ? "پرداخت ناموفق ۷ر" : "Failed payments 7d"}
              metric={billing.failedPayments7d}
              compact
            />
            <AdminMetricCard
              label={isFa ? "وب‌هوک ناموفق ۷ر" : "Webhook failed 7d"}
              metric={billing.webhookFailed7d}
              compact
            />
            <AdminMetricCard
              label={isFa ? "past_due" : "At-risk past_due"}
              metric={billing.atRiskPastDue}
              compact
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href={adminHref(locale, "/billing")}
              prefetch={false}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50"
            >
              {isFa ? "صورتحساب" : "Billing"}
            </Link>
            <Link
              href={adminHref(locale, "/revenue")}
              prefetch={false}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50"
            >
              {isFa ? "درآمد" : "Revenue"}
            </Link>
          </div>
        </AdminSection>
      ) : null}

      {atRiskDisplay ? (
        <AdminSection
          title={isFa ? "مشتریان در ریسک" : "Customers at risk"}
          description={
            isFa
              ? "قانون‌محور — نه 0 جعلی هنگام نبود دسترسی"
              : "Rule-based — never fake 0 when permission denied"
          }
        >
          {atRiskDisplay.kind === "permission_denied" ? (
            <p className="text-sm text-[var(--admin-muted)]">
              Permission denied
              <span className="mt-1 block text-[11px]">
                Reason: {atRiskDisplay.reason}
              </span>
            </p>
          ) : atRiskDisplay.kind === "unavailable" ? (
            <p className="text-sm text-[var(--admin-muted)]">
              Unavailable
              <span className="mt-1 block text-[11px]">
                Reason: {atRiskDisplay.reason}
              </span>
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-display text-2xl tabular-nums text-[var(--admin-fg)]">
                {atRiskDisplay.text}
              </p>
              <Link
                href={adminHref(locale, "/health")}
                prefetch={false}
                className="text-xs text-[var(--admin-muted)] hover:underline"
              >
                {isFa ? "جزئیات سلامت" : "Health details"}
              </Link>
            </div>
          )}
        </AdminSection>
      ) : null}

      {insights && insights.length > 0 ? (
        <AdminSection
          title={isFa ? "بینش‌های عملیاتی" : "Founder Insights"}
          description={isFa ? "حداکثر ۵ سیگنال قطعی — بدون LLM برای fact" : "Top actionable deterministic signals — no LLM facts"}
        >
          <ul className="space-y-2">
            {insights.slice(0, 5).map((insight) => (
              <li key={`${insight.type}:${insight.metric}`}>
                <Link
                  href={adminHref(locale, insight.href ?? "/analytics")}
                  prefetch={false}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-4 py-3 text-sm hover:bg-[var(--admin-muted-bg)]/50"
                >
                  <div>
                    <p className="font-medium text-[var(--admin-fg)]">{insight.title}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{insight.summary}</p>
                    <p className="mt-1 text-[10px] text-[var(--admin-muted)]">
                      {insight.evidence.slice(0, 2).join(" · ")}
                    </p>
                  </div>
                  <AdminStatusBadge
                    tone={
                      insight.severity === "critical"
                        ? "danger"
                        : insight.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {insight.severity}
                  </AdminStatusBadge>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      ) : null}

      <AdminSection title={isFa ? "شاخص‌های اصلی" : "Primary KPIs"} description={isFa ? "منابع واقعی؛ بدون اسکن سنگین AI" : "Real sources; no heavy AI scan"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label={isFa ? "کاربران جدید" : "New Users"} comparable={kpis.newUsers} href={adminHref(locale, "/users")} />
          <AdminMetricCard label={isFa ? "سایت ساخته‌شده" : "Websites Created"} comparable={kpis.websitesCreated} href={adminHref(locale, "/websites")} />
          <AdminMetricCard label={isFa ? "سایت منتشرشده" : "Published Websites"} comparable={kpis.websitesPublished} href={adminHref(locale, "/websites")} />
          <AdminMetricCard label={isFa ? "درخواست‌های AI" : "AI Requests"} comparable={kpis.aiRequests} href={adminHref(locale, "/ai")} />
        </div>
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title={isFa ? "زیرساخت" : "Infrastructure"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricBox label={isFa ? "جاب‌های ناموفق ۲۴ ساعت" : "Failed jobs 24h"} metric={infra.failedJobs24h} />
            <MetricBox label={isFa ? "جاب‌های stale" : "Stale jobs"} metric={infra.staleJobs} />
            <MetricBox label={isFa ? "عمق صف" : "Queue depth"} metric={infra.queueDepth} />
            <MetricBox label={isFa ? "هشدار بحرانی" : "Critical alerts"} metric={infra.criticalAlerts} />
          </div>
        </AdminSection>

        <AdminSection title={isFa ? "نیاز به توجه" : "Attention Required"}>
          {infra.attention.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">{isFa ? "مورد بحرانی مشاهده نشد." : "No current attention items."}</p>
          ) : (
            <ul className="space-y-2">
              {infra.attention.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link href={adminHref(locale, item.href)} prefetch={false} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-4 py-3 text-sm hover:bg-[var(--admin-muted-bg)]/50">
                    <span>{item.title}</span>
                    <AdminStatusBadge tone={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "info"}>{item.severity}</AdminStatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection title={isFa ? "شاخص‌های ثانویه" : "Secondary"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label={isFa ? "ایمپورت‌ها" : "Imports"} comparable={kpis.imports} href={adminHref(locale, "/imports")} />
          <AdminMetricCard label={isFa ? "سفارش‌ها" : "Orders"} comparable={kpis.orders} href={adminHref(locale, "/orders")} />
          <AdminMetricCard label={isFa ? "بازدید صفحات" : "Page Views"} comparable={kpis.pageViews} href={adminHref(locale, "/analytics/product")} />
          <AdminMetricCard label={isFa ? "اشتراک‌های شروع‌شده" : "Subscriptions Started"} comparable={kpis.subscriptionsStarted} href={adminHref(locale, "/subscriptions")} />
        </div>
      </AdminSection>

      <div className="flex flex-wrap gap-2 text-xs text-[var(--admin-muted)]">
        <Link href={adminHref(locale, "/analytics")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "هوش تحلیلی" : "Analytics"}</Link>
        <Link href={adminHref(locale, "/health")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "سلامت مشتری" : "Customer health"}</Link>
        <Link href={adminHref(locale, "/ai")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "AI Control Center" : "AI Control Center"}</Link>
        <Link href={adminHref(locale, "/ai/anomalies")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "ناهنجاری‌ها" : "AI Anomalies"}</Link>
        <Link href={adminHref(locale, "/jobs")} prefetch={false} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 hover:bg-[var(--admin-muted-bg)]/50">{isFa ? "جاب‌ها" : "Jobs"}</Link>
      </div>
    </div>
  );
}

function MetricBox({ label, metric }: { label: string; metric: InfrastructureOverview["failedJobs24h"] }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
      <p className="text-[11px] text-[var(--admin-muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl tabular-nums"><MetricCell metric={metric} /></p>
    </div>
  );
}
