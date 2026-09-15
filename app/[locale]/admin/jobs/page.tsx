import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminJobs } from "@/lib/admin/queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "jobs.read");
  const jobs = await getAdminJobs({ userId, limit: 100 });
  const rows = jobs.map((j) => ({
    id: j.id as string,
    status: (j.status as string) ?? "",
    stage: (j.stage as string) ?? "",
    retry_count: Number(j.retry_count ?? 0),
    duration_ms: j.duration_ms == null ? null : Number(j.duration_ms),
    error_message: (j.error_message as string | null) ?? null,
    created_at: j.created_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "جاب‌ها" : "Jobs"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={locale === "fa" ? "جستجوی وضعیت…" : "Search status…"}
        emptyTitle={locale === "fa" ? "جابی نیست" : "No jobs"}
        columns={[
          {
            id: "status",
            header: "Status",
            sortValue: (r) => r.status,
            cell: (r) => (
              <AdminStatusBadge
                tone={
                  r.status === "failed"
                    ? "danger"
                    : r.status === "completed"
                      ? "success"
                      : "neutral"
                }
              >
                {r.status}
              </AdminStatusBadge>
            ),
          },
          {
            id: "stage",
            header: "Stage",
            cell: (r) => r.stage || "—",
          },
          {
            id: "retry",
            header: "Retry",
            sortValue: (r) => r.retry_count,
            cell: (r) => r.retry_count,
          },
          {
            id: "duration",
            header: "Duration",
            cell: (r) =>
              r.duration_ms == null ? "—" : `${Math.round(r.duration_ms / 1000)}s`,
          },
          {
            id: "created",
            header: locale === "fa" ? "ایجاد" : "Created",
            sortValue: (r) => r.created_at,
            cell: (r) => relativeTime(r.created_at, locale),
          },
        ]}
      />
    </div>
  );
}
