import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAILatencyAnalysis } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { formatMetricNumber } from "@/components/admin/format";
import type { DateRangePreset } from "@/lib/admin/dates";

function nullDash(value: number | null, suffix = ""): string {
  if (value == null) return "—";
  return `${formatMetricNumber(value)}${suffix}`;
}

export default async function AdminAILatencyPage({
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
  const preset = (sp.range as DateRangePreset) || "today";
  const analysis = await getAdminAILatencyAnalysis({ userId, preset });

  const seriesRows = analysis.series.map((s) => ({
    id: s.date,
    ...s,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "تحلیل تأخیر AI" : "AI Latency Analysis"}
        description={
          isFa
            ? `اندازه نمونه: ${analysis.sampleSize} — percentiles فقط با نمونه کافی`
            : `Sample size: ${analysis.sampleSize} — percentiles require sufficient samples`
        }
      />
      <AdminSection title={isFa ? "خلاصه" : "Summary"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="p50 (ms)" metric={analysis.p50} />
          <AdminMetricCard label="p95 (ms)" metric={analysis.p95} />
          <AdminMetricCard label="p99 (ms)" metric={analysis.p99} />
          <AdminMetricCard
            label={isFa ? "نرخ خطا" : "Error rate"}
            metric={analysis.errorRate}
            style="percent"
          />
        </div>
      </AdminSection>
      <AdminSection
        title={isFa ? "سری روزانه" : "Daily series"}
        description={
          isFa
            ? "مقادیر null به‌صورت — نمایش داده می‌شوند"
            : "Null values shown as —"
        }
      >
        <AdminDataTable
          locale={locale}
          rows={seriesRows}
          searchPlaceholder="date…"
          emptyTitle={isFa ? "داده‌ای نیست" : "No data"}
          columns={[
            {
              id: "date",
              header: isFa ? "تاریخ" : "Date",
              cell: (r) => r.date,
              sortValue: (r) => r.date,
            },
            {
              id: "count",
              header: isFa ? "تعداد" : "Count",
              sortValue: (r) => r.count,
              cell: (r) => r.count,
            },
            {
              id: "p50",
              header: "p50",
              cell: (r) => nullDash(r.p50, "ms"),
            },
            {
              id: "p95",
              header: "p95",
              cell: (r) => nullDash(r.p95, "ms"),
            },
            {
              id: "errorRate",
              header: isFa ? "نرخ خطا" : "Error rate",
              cell: (r) =>
                r.errorRate == null
                  ? "—"
                  : formatMetricNumber(r.errorRate, { style: "percent" }),
            },
          ]}
        />
      </AdminSection>
    </div>
  );
}
