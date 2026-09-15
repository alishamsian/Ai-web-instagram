import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminInfrastructureOverview } from "@/lib/admin/phase4-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { InfrastructureOverviewPanel } from "@/components/admin/phase4/InfrastructureOverviewPanel";

export default async function AdminOpsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  const overview = await getAdminInfrastructureOverview({ userId });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "عملیات" : "Operations Overview"}
        description={
          isFa
            ? "وضعیت سیستم از روی ابزار واقعی — بدون uptime جعلی"
            : "System status from real instrumentation — no fake uptime"
        }
      />
      <InfrastructureOverviewPanel locale={locale} overview={overview} />
    </div>
  );
}
