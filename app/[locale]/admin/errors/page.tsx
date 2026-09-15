import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAlerts } from "@/lib/admin/queries";
import { getAdminErrorGroups } from "@/lib/admin/phase5-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminEmptyState,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { ErrorGroupActions } from "@/components/admin/phase5/ErrorGroupActions";
import { relativeTime } from "@/components/admin/format";
import { roleHasPermission } from "@/lib/admin/permissions";
import { settledValue } from "@/lib/admin/safe";

export default async function AdminErrorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { actor, locale, userId } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  const canManage = roleHasPermission(actor.role, "system.manage");

  const [groupsSettled, alertsSettled] = await Promise.all([
    settledValue(
      "errors.groups",
      getAdminErrorGroups({ userId, limit: 50 }),
      { rows: [], unavailableReason: "Temporarily unavailable" },
    ),
    settledValue(
      "errors.alerts",
      getAdminAlerts({ userId, limit: 50 }),
      { rows: [], unavailableReason: "Temporarily unavailable" },
    ),
  ]);

  const groups = groupsSettled.value;
  const alerts = alertsSettled.value;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "مرکز خطاها" : "Error Center"}
        description={
          isFa
            ? "گروه‌بندی deterministic خطاهای عملیاتی + هشدارها — بدون stack خام"
            : "Deterministic operational error groups + alerts — no raw stacks"
        }
      />

      <AdminSection title={isFa ? "گروه‌های خطا" : "Error groups"}>
        {groups.unavailableReason ? (
          <MetricUnavailable
            label={isFa ? "گروه‌های خطا" : "Error groups"}
            reason={groups.unavailableReason}
            compact
          />
        ) : !groups.rows.length ? (
          <AdminEmptyState
            title={isFa ? "گروه خطایی نیست" : "No error groups"}
            body={
              isFa
                ? "هنوز خطای گروه‌بندی‌شده‌ای ثبت نشده است."
                : "No grouped errors recorded yet."
            }
          />
        ) : (
          <AdminDataTable
            locale={locale}
            rows={groups.rows}
            searchPlaceholder="source / code…"
            emptyTitle=""
            columns={[
              {
                id: "source",
                header: isFa ? "منبع" : "Source",
                cell: (r) => r.source,
              },
              {
                id: "code",
                header: isFa ? "کد" : "Code",
                cell: (r) => r.errorCode ?? "—",
              },
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
              {
                id: "count",
                header: isFa ? "تعداد" : "Count",
                sortValue: (r) => r.occurrenceCount,
                cell: (r) => r.occurrenceCount,
              },
              {
                id: "last",
                header: isFa ? "آخرین" : "Last seen",
                sortValue: (r) => r.lastSeenAt,
                cell: (r) => relativeTime(r.lastSeenAt, locale),
              },
              {
                id: "corr",
                header: "Correlation",
                cell: (r) => (
                  <span className="font-mono text-[11px] text-[var(--admin-muted)]">
                    {r.lastCorrelationId?.slice(0, 8) ?? "—"}
                  </span>
                ),
              },
              {
                id: "status",
                header: isFa ? "وضعیت" : "Status",
                cell: (r) => r.status,
              },
              {
                id: "actions",
                header: "",
                cell: (r) =>
                  r.status === "open" ? (
                    <ErrorGroupActions
                      groupId={r.id}
                      locale={locale}
                      canManage={canManage}
                    />
                  ) : null,
              },
            ]}
          />
        )}
      </AdminSection>

      <AdminSection title={isFa ? "هشدارها" : "Alerts"}>
        {alerts.unavailableReason ? (
          <MetricUnavailable
            label={isFa ? "هشدارها" : "Alerts"}
            reason={alerts.unavailableReason}
            compact
          />
        ) : (
          <AdminAlertsPanel
            alerts={alerts.rows}
            locale={locale}
            canManage={canManage}
          />
        )}
      </AdminSection>
    </div>
  );
}
