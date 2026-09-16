import { requireAdminPage } from "@/lib/admin/gate";
import {
  getGrowthIntelligence,
  getCommercialFunnelIntelligence,
} from "@/lib/admin/phase7-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminCard,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import type { DateRangePreset } from "@/lib/admin/dates";

function pct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AdminGrowthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "growth.read");
  const preset = (sp.range as DateRangePreset) || "30d";
  const [growth, funnel] = await Promise.all([
    getGrowthIntelligence({ userId, preset }),
    getCommercialFunnelIntelligence({ userId, preset }),
  ]);
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "رشد" : "Growth"}
        description={
          isFa
            ? "ثبت‌نام، فعال‌سازی، تبدیل پولی و فعالیت — بدون عدد جعلی"
            : "Signups, activation, paid conversion, and activity — no invented figures"
        }
      />

      <AdminSection title={isFa ? "شاخص‌های رشد" : "Growth KPIs"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "ثبت‌نام‌ها" : "Signups"}
            metric={growth.signups}
          />
          <AdminMetricCard
            label={isFa ? "نرخ فعال‌سازی" : "Activation rate"}
            metric={growth.activationRate}
            style="percent"
          />
          <AdminMetricCard
            label={isFa ? "ثبت‌نام → پولی" : "Signup → Paid"}
            metric={growth.signupToPaidRate}
            style="percent"
          />
          <AdminMetricCard
            label={isFa ? "فعال → پولی" : "Activated → Paid"}
            metric={growth.activatedToPaidRate}
            style="percent"
          />
          <AdminMetricCard label="DAU" metric={growth.dau} />
          <AdminMetricCard label="WAU" metric={growth.wau} />
          <AdminMetricCard label="MAU" metric={growth.mau} />
        </div>
        <p className="mt-3 text-[11px] text-[var(--admin-muted)]">{growth.note}</p>
      </AdminSection>

      <AdminSection
        title={isFa ? "قیف تجاری" : "Commercial funnel"}
        description={funnel.note}
      >
        {funnel.steps.length === 0 ? (
          <MetricUnavailable
            label="Funnel"
            reason={isFa ? "داده در دسترس نیست" : "No data available"}
          />
        ) : (
          <div className="space-y-2">
            {funnel.steps.map((stage) => (
              <AdminCard key={stage.id} className="!p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--admin-fg)]">
                      {stage.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
                      {stage.reason ?? stage.source}
                    </p>
                    {stage.conversionFromPrevious != null ? (
                      <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                        {isFa ? "تبدیل از مرحله قبل" : "Conv. from previous"}:{" "}
                        {pct(stage.conversionFromPrevious)} ·{" "}
                        {isFa ? "ریزش" : "Drop-off"}:{" "}
                        {pct(stage.dropOffFromPrevious)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminStatusBadge
                      tone={
                        stage.status === "available"
                          ? "success"
                          : stage.status === "partial"
                            ? "warning"
                            : stage.status === "insufficient_data" ||
                                stage.status === "pending"
                              ? "info"
                              : "neutral"
                      }
                    >
                      {stage.status}
                    </AdminStatusBadge>
                    <span className="tabular-nums text-sm text-[var(--admin-fg)]">
                      {stage.workspaces == null ? "—" : stage.workspaces}
                    </span>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
