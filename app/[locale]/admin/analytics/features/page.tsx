import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminProductAnalytics } from "@/lib/admin/phase3-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminFeaturesPage({
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
      <AdminPageHeader title={locale === "fa" ? "پذیرش فیچر" : "Feature Adoption"} description={locale === "fa" ? "فقط از product_events واقعی" : "Only from real product_events"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="event…"
        emptyTitle={locale === "fa" ? "رویدادی نیست" : "No feature events"}
        columns={[
          { id: "event", header: "Feature / event", cell: (r) => r.event },
          { id: "count", header: "Events", sortValue: (r) => r.count, cell: (r) => r.count },
        ]}
      />
    </div>
  );
}
