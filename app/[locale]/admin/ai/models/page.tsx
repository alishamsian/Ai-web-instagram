import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAIModelsPage({
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
  const rows = breakdown.byModel.map((m) => ({
    id: `${m.provider}-${m.model}`,
    ...m,
  }));
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "مدل‌های AI" : "AI Models"} description={locale === "fa" ? "اندازه‌گیری واقعی — بدون رتبه‌بندی دلخواه" : "Factual measurements — no arbitrary ranking"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="model…"
        emptyTitle={locale === "fa" ? "مدلی نیست" : "No model usage"}
        columns={[
          { id: "provider", header: "Provider", cell: (r) => r.provider },
          { id: "model", header: "Model", cell: (r) => r.model },
          { id: "requests", header: "Requests", sortValue: (r) => r.requests, cell: (r) => r.requests },
          { id: "failed", header: "Failed", sortValue: (r) => r.failed, cell: (r) => r.failed },
          { id: "latency", header: "Avg latency", cell: (r) => (r.avgLatency == null ? "—" : `${r.avgLatency}ms`) },
          { id: "cost", header: "Est. cost", cell: (r) => r.cost.toFixed(4) },
        ]}
      />
    </div>
  );
}
