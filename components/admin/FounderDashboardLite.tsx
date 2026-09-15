import type { DashboardKpis } from "@/lib/admin/contracts";
import type { InfrastructureOverview } from "@/lib/admin/phase4-contracts";
import { AdminPageHeader, AdminSection, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
import { adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";
import type { AdminRole } from "@/lib/admin/permissions";
import Link from "next/link";

export function FounderDashboardLite({
  locale,
  role: _role,
  kpis,
  infra,
}: {
  locale: Locale;
  role: AdminRole;
  kpis: DashboardKpis;
  infra: InfrastructureOverview;
}) {
  const isFa = locale === "fa";
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
