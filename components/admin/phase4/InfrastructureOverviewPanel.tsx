import Link from "next/link";
import type { InfrastructureOverview, DependencyHealth } from "@/lib/admin/phase4-contracts";
import {
  AdminCard,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { adminHref } from "@/components/admin/nav";
import type { Locale } from "@/lib/config/env";

function systemStatusTone(
  status: InfrastructureOverview["systemStatus"],
): "success" | "warning" | "danger" | "neutral" {
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  if (status === "critical") return "danger";
  return "neutral";
}

function dependencyTone(
  status: DependencyHealth["status"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  if (status === "failing") return "danger";
  if (status === "unknown") return "neutral";
  return "info";
}

function attentionTone(
  severity: string,
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "neutral";
}

export function InfrastructureOverviewPanel({
  locale,
  overview,
  showStatusBanner = true,
}: {
  locale: Locale;
  overview: InfrastructureOverview;
  showStatusBanner?: boolean;
}) {
  const isFa = locale === "fa";
  const deps = overview.dependencies;

  return (
    <>
      {showStatusBanner ? (
        <AdminCard>
          <div className="flex flex-wrap items-center gap-3">
            <AdminStatusBadge tone={systemStatusTone(overview.systemStatus)}>
              {overview.systemStatus}
            </AdminStatusBadge>
            <p className="text-sm text-[var(--admin-fg)]">
              {overview.systemStatusReason}
            </p>
          </div>
        </AdminCard>
      ) : null}

      <AdminSection title={isFa ? "شاخص‌ها" : "Metrics"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "جاب‌های ناموفق ۲۴س" : "Failed jobs (24h)"}
            metric={overview.failedJobs24h}
          />
          <AdminMetricCard
            label={isFa ? "جاب‌های کهنه" : "Stale jobs"}
            metric={overview.staleJobs}
          />
          <AdminMetricCard
            label={isFa ? "عمق صف" : "Queue depth"}
            metric={overview.queueDepth}
          />
          <AdminMetricCard
            label={isFa ? "هشدارهای باز" : "Open alerts"}
            metric={overview.openAlerts}
          />
        </div>
      </AdminSection>

      {overview.attention.length > 0 ? (
        <AdminSection
          title={isFa ? "نیاز به توجه" : "Attention required"}
          description={
            isFa
              ? "فقط بر اساس سیگنال‌های واقعی موجود"
              : "Based on available real signals only"
          }
        >
          <ul className="space-y-2">
            {overview.attention.map((item) => (
              <li key={item.id}>
                <Link
                  href={adminHref(locale, item.href)}
                  className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-2.5 text-sm transition-colors hover:border-[var(--admin-fg)]/20"
                >
                  <AdminStatusBadge tone={attentionTone(item.severity)}>
                    {item.severity}
                  </AdminStatusBadge>
                  <span className="text-[var(--admin-fg)]">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      ) : null}

      <AdminSection title={isFa ? "وابستگی‌ها" : "Dependencies"}>
        <AdminDataTable
          locale={locale}
          rows={deps}
          searchPlaceholder={isFa ? "نام…" : "name…"}
          emptyTitle={isFa ? "وابستگی‌ای نیست" : "No dependencies"}
          columns={[
            {
              id: "name",
              header: isFa ? "نام" : "Name",
              cell: (r) => r.name,
              sortValue: (r) => r.name,
            },
            {
              id: "status",
              header: isFa ? "وضعیت" : "Status",
              cell: (r) => (
                <AdminStatusBadge tone={dependencyTone(r.status)}>
                  {r.status.replace(/_/g, " ")}
                </AdminStatusBadge>
              ),
              sortValue: (r) => r.status,
            },
            {
              id: "evidence",
              header: isFa ? "شواهد" : "Evidence",
              cell: (r) => (
                <span className="text-xs text-[var(--admin-muted)]">
                  {r.evidence}
                </span>
              ),
            },
          ]}
        />
      </AdminSection>
    </>
  );
}
