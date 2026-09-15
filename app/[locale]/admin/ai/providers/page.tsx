import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIProvidersIntelligence } from "@/lib/admin/phase4-queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAIProvidersPage({
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
  const { providers, truncated } = await getAdminAIProvidersIntelligence({
    userId,
    preset,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "ارائه‌دهندگان AI" : "AI Providers"}
        description={
          isFa
            ? "نرخ موفقیت مشاهده‌شده از تلمتری — نه uptime SLA"
            : "Observed success rate from telemetry — not provider SLA uptime"
        }
      />
      {truncated ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {isFa
            ? "نمونه قطع شده — آمار از زیرمجموعه"
            : "Sample truncated — stats from subset"}
        </p>
      ) : null}
      <AdminSection>
        <AdminDataTable
          locale={locale}
          rows={providers}
          searchPlaceholder="provider…"
          emptyTitle={isFa ? "ارائه‌دهنده‌ای نیست" : "No providers"}
          columns={[
            {
              id: "provider",
              header: "Provider",
              cell: (r) => r.provider,
              sortValue: (r) => r.provider,
            },
            {
              id: "requests",
              header: isFa ? "درخواست‌ها" : "Requests",
              sortValue: (r) => r.requests,
              cell: (r) => r.requests,
            },
            {
              id: "observedSuccessRate",
              header: isFa ? "نرخ موفقیت مشاهده‌شده" : "Observed success rate",
              cell: (r) => (
                <MetricCell metric={r.observedSuccessRate} style="percent" />
              ),
            },
            {
              id: "errorRate",
              header: isFa ? "نرخ خطا" : "Error rate",
              cell: (r) => <MetricCell metric={r.errorRate} style="percent" />,
            },
            {
              id: "p95",
              header: "p95 (ms)",
              cell: (r) => <MetricCell metric={r.p95} />,
            },
            {
              id: "models",
              header: isFa ? "مدل‌ها" : "Models",
              cell: (r) =>
                r.models.length ? r.models.join(", ") : "—",
            },
          ]}
        />
      </AdminSection>
    </div>
  );
}
