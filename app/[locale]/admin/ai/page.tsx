import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIUsage, getAdminMetricSeries } from "@/lib/admin/queries";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import {
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminLineChart } from "@/components/admin/AdminChart";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAIPage({
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
  const [ai, series, breakdown] = await Promise.all([
    getAdminAIUsage({ userId, preset }),
    getAdminMetricSeries({ userId, preset, column: "ai_requests" }),
    getAdminAIBreakdown({ userId, preset }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "هوش مصنوعی" : "AI Overview"}
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminMetricCard
            label={locale === "fa" ? "درخواست‌ها" : "Requests"}
            comparable={ai.requests}
          />
          <AdminMetricCard
            label={locale === "fa" ? "کامل‌شده" : "Completed"}
            metric={ai.completed}
          />
          <AdminMetricCard
            label={locale === "fa" ? "ناموفق" : "Failed"}
            metric={ai.failed}
          />
          <AdminMetricCard
            label={locale === "fa" ? "هزینه تخمینی" : "Estimated Cost"}
            comparable={ai.estimatedCost}
            style="currency"
          />
          <AdminMetricCard
            label={locale === "fa" ? "میانگین تأخیر (ms)" : "Avg Latency (ms)"}
            metric={ai.avgLatencyMs}
          />
          <AdminMetricCard label="p50 latency" metric={breakdown.latency.p50} />
          <AdminMetricCard label="p95 latency" metric={breakdown.latency.p95} />
          <AdminMetricCard label="p99 latency" metric={breakdown.latency.p99} />
        </div>
      </AdminSection>
      <AdminLineChart
        label={locale === "fa" ? "روند درخواست‌ها" : "Request Trend"}
        points={series.points}
        emptyLabel={
          locale === "fa"
            ? "هنوز دادهٔ daily_metrics نیست"
            : "No daily_metrics data yet"
        }
        unavailableReason={
          series.status === "unavailable" ? series.reason : undefined
        }
      />
    </div>
  );
}
