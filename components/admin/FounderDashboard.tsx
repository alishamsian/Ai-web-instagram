import type {
  AIMetrics,
  ActivityItem,
  AlertSummary,
  DashboardKpis,
  ImportMetrics,
  SystemHealthMetrics,
} from "@/lib/admin/contracts";
import type { MetricSeriesResult } from "@/lib/admin/queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLineChart } from "@/components/admin/AdminChart";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { AdminSystemHealthGrid } from "@/components/admin/AdminSystemHealth";
import { adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";
import { roleHasPermission, type AdminRole } from "@/lib/admin/permissions";

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
}) {
  const isFa = locale === "fa";
  const canManage = roleHasPermission(role, "system.manage");

  const successRate =
    imports.successRate.status === "available"
      ? imports.successRate
      : undefined;

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
        title={isFa ? "در دسترس نیست / نیاز به یکپارچه‌سازی" : "Unavailable / needs integration"}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSection title={isFa ? "نمای AI" : "AI Snapshot"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminMetricCard
              label={isFa ? "درخواست‌ها" : "Requests"}
              comparable={ai.requests}
            />
            <AdminMetricCard
              label={isFa ? "کامل‌شده" : "Completed"}
              metric={ai.completed}
            />
            <AdminMetricCard
              label={isFa ? "ناموفق" : "Failed"}
              metric={ai.failed}
            />
            <AdminMetricCard
              label={isFa ? "هزینه تخمینی" : "Estimated Cost"}
              comparable={ai.estimatedCost}
              style="currency"
            />
            <AdminMetricCard
              label={isFa ? "میانگین تأخیر" : "Avg Latency"}
              metric={ai.avgLatencyMs}
            />
          </div>
        </AdminSection>

        <AdminSection title={isFa ? "سلامت ایمپورت" : "Import Health"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminMetricCard
              label={isFa ? "شروع‌شده" : "Started"}
              comparable={imports.started}
            />
            <AdminMetricCard
              label={isFa ? "موفق" : "Successful"}
              comparable={imports.successful}
            />
            <AdminMetricCard
              label={isFa ? "ناموفق" : "Failed"}
              comparable={imports.failed}
            />
            <AdminMetricCard
              label={isFa ? "نرخ موفقیت" : "Success Rate"}
              metric={imports.successRate}
              style="percent"
            />
          </div>
          <p className="mt-3 text-[11px] text-[var(--admin-muted)]">
            {isFa
              ? "pipeline مرحله‌ای فقط وقتی دادهٔ stage موجود باشد نمایش داده می‌شود — فعلاً از متریک‌های تجمیعی استفاده می‌شود."
              : "Stage pipeline shown only when stage telemetry exists — aggregate metrics used for now."}
          </p>
        </AdminSection>
      </div>

      <AdminSection title={isFa ? "قیف فعال‌سازی" : "Activation Funnel"}>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-card)] px-5 py-6">
          <ol className="space-y-2 text-sm text-[var(--admin-muted)]">
            {[
              isFa ? "ثبت‌نام" : "Signup",
              isFa ? "اتصال اینستاگرام" : "Instagram Connected",
              isFa ? "ایمپورت کامل" : "Import Completed",
              isFa ? "ساخت سایت" : "Website Generated",
              isFa ? "ویرایش سایت" : "Website Edited",
              isFa ? "انتشار سایت" : "Website Published",
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--admin-muted-bg)] text-[11px] font-medium text-[var(--admin-fg)]">
                  {i + 1}
                </span>
                <span className="text-[var(--admin-fg)]">{step}</span>
                <span className="text-[11px]">
                  {isFa ? "— ابزار دقیق هنوز نیست" : "— instrumentation pending"}
                </span>
              </li>
            ))}
          </ol>
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
    </div>
  );
}
