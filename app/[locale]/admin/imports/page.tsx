import { requireAdminPage } from "@/lib/admin/gate";
import {
  getAdminImports,
  getAdminImportMetrics,
} from "@/lib/admin/queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";
import { relativeTime } from "@/components/admin/format";
import Link from "next/link";
import { adminHref } from "@/components/admin/nav";
import { AdminExportLink } from "@/components/admin/AdminExportLink";

export default async function AdminImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; focus?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "imports.read");
  const preset = (sp.range as DateRangePreset) || "30d";
  const [{ rows: imports, unavailableReason: importsUnavailable }, metrics] =
    await Promise.all([
      getAdminImports({ userId, preset, limit: 100 }),
      getAdminImportMetrics({ userId, preset }),
    ]);
  const isFa = locale === "fa";
  const rows = imports.map((item) => ({
    id: item.id as string,
    username: (item.username as string) ?? "",
    scrape_status: (item.scrape_status as string) ?? "",
    collector: (item.collector as string) ?? "",
    workspace_id: (item.workspace_id as string | null) ?? null,
    updated_at: item.updated_at as string,
    created_at: (item.created_at as string | null) ?? null,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "ایمپورت‌ها" : "Imports"}
        description={
          isFa
            ? "عملیات Instagram import — فقط داده واقعی"
            : "Instagram import operations — real data only"
        }
        actions={<AdminExportLink entity="imports" />}
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "شروع‌شده" : "Started"}
            comparable={metrics.started}
          />
          <AdminMetricCard
            label={isFa ? "موفق" : "Successful"}
            comparable={metrics.successful}
          />
          <AdminMetricCard
            label={isFa ? "ناموفق" : "Failed"}
            comparable={metrics.failed}
          />
          <AdminMetricCard
            label={isFa ? "نرخ موفقیت" : "Success rate"}
            metric={metrics.successRate}
            style="percent"
          />
        </div>
      </AdminSection>
      {importsUnavailable ? (
        <MetricUnavailable
          label={isFa ? "فهرست ایمپورت‌ها در دسترس نیست" : "Import list unavailable"}
          reason={importsUnavailable}
          compact
        />
      ) : null}
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="@username"
        emptyTitle={isFa ? "ایمپورتی نیست" : "No imports"}
        columns={[
          {
            id: "username",
            header: "Username",
            sortValue: (r) => r.username,
            cell: (r) => (
              <div>
                <p className="font-medium">@{r.username}</p>
                <div className="mt-1 flex gap-2 text-[11px]">
                  <Link
                    href={`${adminHref(locale, "/jobs")}?q=${r.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    Jobs
                  </Link>
                  {r.workspace_id ? (
                    <Link
                      href={`${adminHref(locale, "/workspaces")}?focus=${r.workspace_id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      Workspace
                    </Link>
                  ) : null}
                </div>
              </div>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <AdminStatusBadge
                tone={
                  r.scrape_status === "failed"
                    ? "danger"
                    : r.scrape_status === "completed" ||
                        r.scrape_status === "ready"
                      ? "success"
                      : "neutral"
                }
              >
                {r.scrape_status}
              </AdminStatusBadge>
            ),
          },
          {
            id: "collector",
            header: "Collector",
            cell: (r) => r.collector || "—",
          },
          {
            id: "updated",
            header: isFa ? "به‌روز" : "Updated",
            sortValue: (r) => r.updated_at,
            cell: (r) => relativeTime(r.updated_at, locale),
          },
        ]}
      />
    </div>
  );
}
