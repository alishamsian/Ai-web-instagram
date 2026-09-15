import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIEconomics } from "@/lib/admin/phase4-queries";
import { AI_PRICING_UNAVAILABLE_REASON } from "@/lib/admin/ai-pricing";
import {
  AdminPageHeader,
  AdminSection,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
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
  const isFa = locale === "fa";
  const preset = (sp.range as DateRangePreset) || "30d";
  const economics = await getAdminAIEconomics({ userId, preset });

  const byModel = economics.byModel.map((m) => ({
    id: `${m.provider}::${m.model}`,
    ...m,
  }));
  const byFeature = economics.byFeature.map((f) => ({
    id: f.feature,
    ...f,
  }));
  const byProvider = economics.byProvider.map((p) => ({
    id: p.provider,
    ...p,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "اقتصاد AI" : "AI Economics"}
        description={
          isFa
            ? "هزینه فقط با قیمت‌گذاری تأییدشده یا estimated_cost لاگ‌شده"
            : "Cost only with verified pricing or logged estimated_cost"
        }
      />
      {!economics.pricingConfigured ? (
        <MetricUnavailable
          label={isFa ? "قیمت‌گذاری تأییدنشده" : "Verified pricing not configured"}
          reason={AI_PRICING_UNAVAILABLE_REASON}
          compact
        />
      ) : null}
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard
            label={isFa ? "هزینه کل" : "Total cost"}
            metric={economics.totalCost}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "هزینه هر درخواست" : "Cost per request"}
            metric={economics.costPerRequest}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "پیش‌بینی ۳۰ روز" : "Projected 30d spend"}
            metric={economics.projectedSpend}
            style="currency"
          />
        </div>
      </AdminSection>
      <AdminSection title={isFa ? "بر اساس مدل" : "By model"}>
        <AdminDataTable
          locale={locale}
          rows={byModel}
          searchPlaceholder="model…"
          emptyTitle={isFa ? "داده‌ای نیست" : "No data"}
          columns={[
            { id: "provider", header: "Provider", cell: (r) => r.provider },
            { id: "model", header: "Model", cell: (r) => r.model },
            {
              id: "requests",
              header: isFa ? "درخواست‌ها" : "Requests",
              sortValue: (r) => r.requests,
              cell: (r) => r.requests,
            },
            {
              id: "cost",
              header: isFa ? "هزینه" : "Cost",
              cell: (r) => <MetricCell metric={r.cost} style="currency" />,
            },
          ]}
        />
      </AdminSection>
      <AdminSection title={isFa ? "بر اساس feature" : "By feature"}>
        <AdminDataTable
          locale={locale}
          rows={byFeature}
          searchPlaceholder="feature…"
          emptyTitle={isFa ? "داده‌ای نیست" : "No data"}
          columns={[
            { id: "feature", header: "Feature", cell: (r) => r.feature },
            {
              id: "requests",
              header: isFa ? "درخواست‌ها" : "Requests",
              sortValue: (r) => r.requests,
              cell: (r) => r.requests,
            },
            {
              id: "cost",
              header: isFa ? "هزینه" : "Cost",
              cell: (r) => <MetricCell metric={r.cost} style="currency" />,
            },
          ]}
        />
      </AdminSection>
      <AdminSection title={isFa ? "بر اساس ارائه‌دهنده" : "By provider"}>
        <AdminDataTable
          locale={locale}
          rows={byProvider}
          searchPlaceholder="provider…"
          emptyTitle={isFa ? "داده‌ای نیست" : "No data"}
          columns={[
            { id: "provider", header: "Provider", cell: (r) => r.provider },
            {
              id: "requests",
              header: isFa ? "درخواست‌ها" : "Requests",
              sortValue: (r) => r.requests,
              cell: (r) => r.requests,
            },
            {
              id: "cost",
              header: isFa ? "هزینه" : "Cost",
              cell: (r) => <MetricCell metric={r.cost} style="currency" />,
            },
          ]}
        />
      </AdminSection>
    </div>
  );
}
