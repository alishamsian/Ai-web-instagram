import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, MetricUnavailable } from "@/components/admin/primitives";

export default async function AdminCohortsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "هم‌گروه‌ها" : "Cohorts"} />
      <MetricUnavailable label="Signup / activation / publication cohorts" reason="Cohort engine requires durable event instrumentation per stage" />
    </div>
  );
}
