import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAlerts } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminAlertsPanel } from "@/components/admin/AdminAlertsPanel";
import { roleHasPermission } from "@/lib/admin/permissions";

export default async function AdminErrorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { actor, locale, userId } = await requireAdminPage(raw, "system.read");
  const alerts = await getAdminAlerts({ userId, limit: 50 });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "خطاها و هشدارها" : "Errors & Alerts"}
      />
      <AdminAlertsPanel
        alerts={alerts}
        locale={locale}
        canManage={roleHasPermission(actor.role, "system.manage")}
      />
    </div>
  );
}
