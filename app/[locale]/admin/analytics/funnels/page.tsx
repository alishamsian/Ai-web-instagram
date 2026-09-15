import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminFunnelView } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminCard, AdminStatusBadge } from "@/components/admin/primitives";

export default async function AdminFunnelsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const funnel = await getAdminFunnelView({ userId });
  const isFa = locale === "fa";
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "قیف فعال‌سازی" : "Activation Funnel"}
        description={isFa ? "فقط مراحل دارای instrumentation واقعی" : "Only stages with real instrumentation"}
      />
      <div className="space-y-2">
        {funnel.stages.map((stage) => (
          <AdminCard key={stage.id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--admin-fg)]">{stage.label}</p>
                <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
                  {"source" in stage && stage.source ? stage.source : "reason" in stage ? stage.reason : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AdminStatusBadge tone={stage.status === "available" ? "success" : stage.status === "partial" ? "warning" : "neutral"}>
                  {stage.status}
                </AdminStatusBadge>
                <span className="tabular-nums text-sm text-[var(--admin-fg)]">
                  {funnel.counts[stage.id] == null ? "—" : funnel.counts[stage.id]}
                </span>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
