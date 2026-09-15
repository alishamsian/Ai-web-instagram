import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminUsersEnriched } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminSection, MetricUnavailable } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminUserAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "users.read");
  const { metrics } = await getAdminUsersEnriched({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
  });
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "آنالیتیکس کاربران" : "User Analytics"} />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AdminMetricCard label={locale === "fa" ? "کل" : "Total"} metric={metrics.totalUsers} />
          <AdminMetricCard label={locale === "fa" ? "جدید" : "New"} metric={metrics.newUsers} />
          <AdminMetricCard label={locale === "fa" ? "فعال" : "Active"} metric={metrics.lastActivity} />
        </div>
      </AdminSection>
      <MetricUnavailable
        label="DAU / WAU / MAU"
        reason="Active-user session instrumentation is not available — will not be inferred from unrelated timestamps"
      />
    </div>
  );
}
