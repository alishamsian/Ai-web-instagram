import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAlerts } from "@/lib/admin/queries";
import {
  AdminPageHeader,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { roleHasPermission } from "@/lib/admin/permissions";

export default async function AdminErrorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { actor, locale, userId } = await requireAdminPage(raw, "system.read");
  const alertsResult = await getAdminAlerts({ userId, limit: 50 });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "خطاها و هشدارها" : "Errors & Alerts"}
      />
      {alertsResult.unavailableReason ? (
        <MetricUnavailable
          label={locale === "fa" ? "هشدارها" : "Alerts"}
          reason={alertsResult.unavailableReason}
          compact
        />
      ) : (
        <AdminAlertsPanel
          alerts={alertsResult.rows}
          locale={locale}
          canManage={roleHasPermission(actor.role, "system.manage")}
        />
      )}
    </div>
  );
}
