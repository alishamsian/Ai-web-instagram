import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminIncidents } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminEmptyState, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { IncidentsClient } from "@/components/admin/phase3/IncidentsClient";
import { relativeTime } from "@/components/admin/format";
import { roleHasPermission } from "@/lib/admin/permissions";

export default async function AdminIncidentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { actor, locale, userId } = await requireAdminPage(raw, "system.read");
  const incidents = await getAdminIncidents({ userId });
  const rows = incidents.map((i) => ({
    id: i.id as string,
    title: i.title as string,
    severity: i.severity as string,
    status: i.status as string,
    affected_system: (i.affected_system as string | null) ?? "",
    started_at: i.started_at as string,
  }));
  const canManage = roleHasPermission(actor.role, "system.manage");
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "مدیریت حوادث" : "Incident Management"} />
      {canManage ? <IncidentsClient locale={locale} /> : null}
      {!rows.length ? (
        <AdminEmptyState
          title={locale === "fa" ? "حادثه‌ای نیست" : "No incidents"}
          body={locale === "fa" ? "مایگریشن Phase 3 را اعمال کنید یا حادثه جدید بسازید." : "Apply Phase 3 migration or create an incident."}
        />
      ) : (
        <AdminDataTable
          locale={locale}
          rows={rows}
          searchPlaceholder="title…"
          emptyTitle=""
          columns={[
            { id: "title", header: "Title", cell: (r) => r.title },
            { id: "severity", header: "Severity", cell: (r) => <AdminStatusBadge tone={r.severity === "critical" ? "danger" : r.severity === "warning" ? "warning" : "info"}>{r.severity}</AdminStatusBadge> },
            { id: "status", header: "Status", cell: (r) => r.status },
            { id: "system", header: "System", cell: (r) => r.affected_system || "—" },
            { id: "started", header: "Started", sortValue: (r) => r.started_at, cell: (r) => relativeTime(r.started_at, locale) },
          ]}
        />
      )}
    </div>
  );
}
