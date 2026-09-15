import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAIUsagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "ai.read");
  const breakdown = await getAdminAIBreakdown({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
  });
  const rows = breakdown.byFeature.map((f) => ({
    id: f.feature,
    feature: f.feature,
    requests: f.requests,
    failed: f.failed,
  }));
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "مصرف AI" : "AI Usage"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="feature…"
        emptyTitle={locale === "fa" ? "داده‌ای نیست" : "No AI usage"}
        columns={[
          { id: "feature", header: "Feature", cell: (r) => r.feature },
          { id: "requests", header: "Requests", sortValue: (r) => r.requests, cell: (r) => r.requests },
          { id: "failed", header: "Failed", sortValue: (r) => r.failed, cell: (r) => r.failed },
        ]}
      />
    </div>
  );
}
