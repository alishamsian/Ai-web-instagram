import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminSubscriptionsView } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminSection, MetricUnavailable } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";

export default async function AdminSubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "billing.read");
  const view = await getAdminSubscriptionsView({ userId });
  const isFa = locale === "fa";
  const rows = view.rows.map((r) => ({
    id: r.workspaceId,
    name: r.name,
    plan: r.plan,
    maxWebsites: r.entitlements.maxWebsites,
    maxImports: r.entitlements.maxImports,
    maxAi: r.entitlements.maxAiGenerations,
    customDomain: r.entitlements.customDomain,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "اشتراک و entitlement" : "Subscriptions & Entitlements"}
        description={view.note}
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard label="Stripe / renewals" metric={view.stripe} />
          <MetricUnavailable
            label="MRR from subscriptions table"
            reason="subscriptions table unused — plan is on workspaces.plan"
          />
        </div>
      </AdminSection>
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={isFa ? "جستجو…" : "Search…"}
        emptyTitle={isFa ? "ورک‌اسپیسی نیست" : "No workspaces"}
        columns={[
          { id: "name", header: isFa ? "ورک‌اسپیس" : "Workspace", sortValue: (r) => r.name, cell: (r) => r.name },
          { id: "plan", header: "Plan", sortValue: (r) => r.plan, cell: (r) => r.plan },
          { id: "sites", header: "maxWebsites", cell: (r) => r.maxWebsites },
          { id: "imports", header: "maxImports", cell: (r) => r.maxImports },
          { id: "ai", header: "maxAi", cell: (r) => r.maxAi },
          { id: "domain", header: "customDomain", cell: (r) => (r.customDomain ? "yes" : "no") },
        ]}
      />
    </div>
  );
}
