import { requireAdminPage } from "@/lib/admin/gate";
import { getFunnelIntelligence } from "@/lib/admin/phase6-queries";
import {
  AdminPageHeader,
  AdminCard,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";

function pct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AdminFunnelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const funnel = await getFunnelIntelligence({
    userId,
    preset: (sp.range as "7d" | "30d" | "90d") || "30d",
  });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "قیف فعال‌سازی" : "Activation Funnel"}
        description={funnel.note}
      />
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
    </div>
  );
}
