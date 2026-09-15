import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminWorkspacesEnriched } from "@/lib/admin/phase3-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HealthBadge } from "@/components/admin/phase3/HealthBadge";
import { relativeTime } from "@/components/admin/format";
import { adminHref } from "@/components/admin/nav";

export default async function AdminWorkspacesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const { metrics, rows } = await getAdminWorkspacesEnriched({
    userId,
    limit: 100,
  });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "ورک‌اسپیس‌ها" : "Workspaces"}
        description={
          isFa
            ? "نمای عملیاتی ورک‌اسپیس‌ها با سلامت قانون‌محور"
            : "Operational workspace view with rule-based health"
        }
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label={isFa ? "کل" : "Total"} metric={metrics.total} />
          <AdminMetricCard
            label={isFa ? "دارای سایت" : "With websites"}
            metric={metrics.withWebsites}
          />
          <AdminMetricCard
            label={isFa ? "منتشرشده" : "Published"}
            metric={metrics.published}
          />
          <AdminMetricCard
            label={isFa ? "توزیع پلن" : "Plan mix"}
            metric={
              metrics.planDistribution.status === "available"
                ? {
                    status: "available" as const,
                    value: Object.keys(metrics.planDistribution.value).length,
                    source: metrics.planDistribution.source,
                  }
                : metrics.planDistribution.status === "partial"
                  ? {
                      status: "partial" as const,
                      value: Object.keys(metrics.planDistribution.value).length,
                      source: metrics.planDistribution.source,
                      warning: metrics.planDistribution.warning,
                    }
                  : {
                      status: "unavailable" as const,
                      reason: metrics.planDistribution.reason,
                      source: metrics.planDistribution.source,
                    }
            }
          />
        </div>
        {metrics.planDistribution.status === "available" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(metrics.planDistribution.value).map(([plan, n]) => (
              <AdminStatusBadge key={plan} tone="neutral">
                {plan}: {n}
              </AdminStatusBadge>
            ))}
          </div>
        ) : null}
      </AdminSection>
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={isFa ? "جستجو…" : "Search…"}
        emptyTitle={isFa ? "ورک‌اسپیسی نیست" : "No workspaces"}
        columns={[
          {
            id: "name",
            header: isFa ? "نام" : "Name",
            sortValue: (r) => r.name,
            cell: (r) => r.name,
          },
          {
            id: "owner",
            header: "Owner",
            cell: (r) => (
              <Link
                href={`${adminHref(locale, "/users")}?focus=${r.ownerId}`}
                className="font-mono text-[11px] underline-offset-2 hover:underline"
              >
                {r.ownerId.slice(0, 8)}…
              </Link>
            ),
          },
          {
            id: "plan",
            header: "Plan",
            sortValue: (r) => r.plan,
            cell: (r) => r.plan,
          },
          {
            id: "sites",
            header: isFa ? "سایت‌ها" : "Sites",
            sortValue: (r) => r.websiteCount,
            cell: (r) => `${r.websiteCount}/${r.publishedCount}`,
          },
          {
            id: "imports",
            header: "Imports",
            sortValue: (r) => r.importCount,
            cell: (r) => r.importCount,
          },
          {
            id: "domains",
            header: "Domains",
            sortValue: (r) => r.domainCount,
            cell: (r) => r.domainCount,
          },
          {
            id: "orders",
            header: "Orders",
            sortValue: (r) => r.orderCount,
            cell: (r) => r.orderCount,
          },
          {
            id: "health",
            header: isFa ? "سلامت" : "Health",
            cell: (r) => <HealthBadge health={r.health} locale={locale} />,
          },
          {
            id: "created",
            header: isFa ? "ایجاد" : "Created",
            sortValue: (r) => r.createdAt,
            cell: (r) => relativeTime(r.createdAt, locale),
          },
        ]}
      />
    </div>
  );
}
