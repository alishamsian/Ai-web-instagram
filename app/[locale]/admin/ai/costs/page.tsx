import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import { getAdminAIUsage } from "@/lib/admin/queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAICostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "ai.read");
  const preset = (sp.range as DateRangePreset) || "30d";
  const [ai, breakdown] = await Promise.all([
    getAdminAIUsage({ userId, preset }),
    getAdminAIBreakdown({ userId, preset }),
  ]);
  const rows = breakdown.byModel.map((m) => ({
    id: `${m.provider}-${m.model}`,
    provider: m.provider,
    model: m.model,
    cost: m.cost,
    requests: m.requests,
  }));
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "هزینه AI" : "AI Costs"}
        description={
          locale === "fa"
            ? "هزینه تخمینی فقط از ai_usage_logs.estimated_cost"
            : "Estimated cost only from ai_usage_logs.estimated_cost"
        }
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard
            label={locale === "fa" ? "هزینه تخمینی" : "Estimated cost"}
            comparable={ai.estimatedCost}
            style="currency"
          />
        </div>
      </AdminSection>
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="model…"
        emptyTitle={locale === "fa" ? "هزینه‌ای ثبت نشده" : "No cost samples"}
        columns={[
          { id: "provider", header: "Provider", cell: (r) => r.provider },
          { id: "model", header: "Model", cell: (r) => r.model },
          { id: "requests", header: "Requests", cell: (r) => r.requests },
          {
            id: "cost",
            header: "Est. cost",
            sortValue: (r) => r.cost,
            cell: (r) => r.cost.toFixed(4),
          },
        ]}
      />
    </div>
  );
}
