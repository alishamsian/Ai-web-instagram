import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIOverview } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
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
  const overview = await getAdminAIOverview({ userId, preset });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "هوش مصنوعی" : "AI Overview"}
        description={
          isFa
            ? "فقط از ai_usage_logs — بدون uptime یا هزینهٔ جعلی"
            : "From ai_usage_logs only — no fake uptime or cost"
        }
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "درخواست‌ها" : "Requests"}
            metric={overview.requests}
          />
          <AdminMetricCard
            label={isFa ? "نرخ موفقیت" : "Success rate"}
            metric={overview.successRate}
            style="percent"
          />
          <AdminMetricCard
            label={isFa ? "نرخ خطا" : "Error rate"}
            metric={overview.errorRate}
            style="percent"
          />
          <AdminMetricCard
            label={isFa ? "تأخیر p95 (ms)" : "Latency p95 (ms)"}
            metric={overview.latencyP95}
          />
          <AdminMetricCard
            label={isFa ? "توکن‌ها" : "Tokens"}
            metric={overview.tokens}
          />
          <AdminMetricCard
            label={isFa ? "هزینه" : "Cost"}
            metric={overview.cost}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "مدل‌های فعال" : "Active models"}
            metric={overview.activeModels}
          />
          <AdminMetricCard
            label={isFa ? "ارائه‌دهندگان فعال" : "Active providers"}
            metric={overview.activeProviders}
          />
        </div>
        {overview.truncated ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {isFa
              ? `نمونه در ${overview.sampleSize} ردیف قطع شد — نرخ‌ها از زیرمجموعه`
              : `Sample truncated at ${overview.sampleSize} rows — rates from subset`}
          </p>
        ) : null}
      </AdminSection>
    </div>
  );
}
