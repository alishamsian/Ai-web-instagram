import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminIncidents } from "@/lib/admin/phase3-queries";
import {
  AdminPageHeader,
  AdminEmptyState,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { IncidentsClient } from "@/components/admin/phase3/IncidentsClient";
import { IncidentActions } from "@/components/admin/phase5/IncidentActions";
import { relativeTime } from "@/components/admin/format";
import { roleHasPermission } from "@/lib/admin/permissions";

export default async function AdminIncidentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { actor, locale, userId } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  const { rows: incidents, unavailableReason } = await getAdminIncidents({
    userId,
  });
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
      <AdminPageHeader
        title={isFa ? "مدیریت حوادث" : "Incident Management"}
        description={
          isFa
            ? "چرخه عمر: open → acknowledged → investigating → resolved"
            : "Lifecycle: open → acknowledged → investigating → resolved"
        }
      />
      {unavailableReason ? (
        <MetricUnavailable
          label={isFa ? "فهرست حوادث در دسترس نیست" : "Incident list unavailable"}
          reason={unavailableReason}
          compact
        />
      ) : null}
      {canManage && !unavailableReason ? <IncidentsClient locale={locale} /> : null}
      {unavailableReason ? null : !rows.length ? (
        <AdminEmptyState
          title={isFa ? "حادثه‌ای نیست" : "No incidents"}
          body={isFa ? "حادثه‌ای ثبت نشده است." : "No incidents recorded."}
        />
      ) : (
        <AdminDataTable
          locale={locale}
          rows={rows}
          searchPlaceholder="title…"
          emptyTitle=""
          columns={[
            { id: "title", header: isFa ? "عنوان" : "Title", cell: (r) => r.title },
            {
              id: "severity",
              header: isFa ? "شدت" : "Severity",
              cell: (r) => (
                <AdminStatusBadge
                  tone={
                    r.severity === "critical"
                      ? "danger"
                      : r.severity === "warning"
                        ? "warning"
                        : "info"
                  }
                >
                  {r.severity}
                </AdminStatusBadge>
              ),
            },
            { id: "status", header: isFa ? "وضعیت" : "Status", cell: (r) => r.status },
            {
              id: "system",
              header: isFa ? "سیستم" : "System",
              cell: (r) => r.affected_system || "—",
            },
            {
              id: "started",
              header: isFa ? "شروع" : "Started",
              sortValue: (r) => r.started_at,
              cell: (r) => relativeTime(r.started_at, locale),
            },
            {
              id: "actions",
              header: isFa ? "اقدام" : "Actions",
              cell: (r) => (
                <IncidentActions
                  incidentId={r.id}
                  currentStatus={r.status}
                  locale={locale}
                  canManage={canManage}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
