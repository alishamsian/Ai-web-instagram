import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminProductAnalytics } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLineChart } from "@/components/admin/AdminChart";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const analytics = await getAdminProductAnalytics({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
  });
  const rows = analytics.byEvent.map((e) => ({ id: e.event, event: e.event, count: e.count }));
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "آنالیتیکس محصول" : "Product Analytics"} />
      <AdminSection>
        <AdminMetricCard label={locale === "fa" ? "حجم رویداد" : "Event volume"} metric={analytics.eventVolume} />
      </AdminSection>
      <AdminLineChart
        label={locale === "fa" ? "رویداد در روز" : "Events / day"}
        points={analytics.series.map((s) => ({ date: s.date, value: s.count }))}
        emptyLabel={locale === "fa" ? "رویدادی نیست" : "No events"}
      />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="event…"
        emptyTitle={locale === "fa" ? "رویدادی نیست" : "No events"}
        columns={[
          { id: "event", header: "Event", cell: (r) => r.event },
          { id: "count", header: "Count", sortValue: (r) => r.count, cell: (r) => r.count },
        ]}
      />
    </div>
  );
}
