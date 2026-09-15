import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminJobs, getAdminSystemHealth } from "@/lib/admin/queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminQueuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "jobs.read");
  const [jobs, health] = await Promise.all([
    getAdminJobs({ userId, limit: 100 }),
    getAdminSystemHealth({ userId }),
  ]);
  const isFa = locale === "fa";
  const rows = jobs.map((j) => ({
    id: j.id as string,
    status: (j.status as string) ?? "",
    stage: (j.stage as string) ?? "",
    created_at: j.created_at as string,
  }));
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "صف‌ها" : "Queues"}
        description={isFa ? "در حال حاضر فقط صف import_jobs وجود دارد — نه Redis/SQS." : "Currently only import_jobs queue exists — not Redis/SQS."}
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard label={isFa ? "عمق صف" : "Queue depth"} metric={health.queueDepth} />
          <AdminMetricCard label={isFa ? "ناموفق ۲۴س" : "Failed 24h"} metric={health.failedJobs24h} />
        </div>
      </AdminSection>
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="status…"
        emptyTitle={isFa ? "جابی نیست" : "No jobs"}
        columns={[
          { id: "id", header: "ID", cell: (r) => <span className="font-mono text-[11px]">{r.id.slice(0, 8)}…</span> },
          { id: "status", header: "Status", cell: (r) => r.status },
          { id: "stage", header: "Stage", cell: (r) => r.stage || "—" },
          { id: "created", header: isFa ? "ایجاد" : "Created", sortValue: (r) => r.created_at, cell: (r) => relativeTime(r.created_at, locale) },
        ]}
      />
    </div>
  );
}
