import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, MetricUnavailable } from "@/components/admin/primitives";

export default async function AdminRetentionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "نگه‌داشت" : "Retention"} />
      <MetricUnavailable
        label="Cohort retention heatmap"
        reason={locale === "fa" ? "نیاز به رویدادهای بازگشت کاربر (session/return) دارد" : "Requires return/session cohort events that are not instrumented yet"}
      />
    </div>
  );
}
