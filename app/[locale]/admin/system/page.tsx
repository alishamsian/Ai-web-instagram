import { requireAdminPage } from "@/lib/admin/gate";
import {
  getAdminInfrastructureOverview,
  getAdminDependencyHealth,
} from "@/lib/admin/phase4-queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { InfrastructureOverviewPanel } from "@/components/admin/phase4/InfrastructureOverviewPanel";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";

export default async function AdminSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  const [overview, deps] = await Promise.all([
    getAdminInfrastructureOverview({ userId }),
    getAdminDependencyHealth({ userId }),
  ]);

  const failing = deps.filter((d) => d.status === "failing").length;
  const degraded = deps.filter((d) => d.status === "degraded").length;
  const notInstrumented = deps.filter(
    (d) => d.status === "not_instrumented",
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "سلامت سیستم" : "System Health"}
        description={
          isFa
            ? "بدون uptime جعلی — فقط سیگنال‌های واقعی موجود"
            : "No fake uptime — only available real signals"
        }
      />
      <AdminSection title={isFa ? "خلاصه وابستگی‌ها" : "Dependency summary"}>
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard
            label={isFa ? "ناموفق" : "Failing"}
            metric={{
              status: "available",
              value: failing,
              source: "dependency_health",
            }}
          />
          <AdminMetricCard
            label={isFa ? "تضعیف‌شده" : "Degraded"}
            metric={{
              status: "available",
              value: degraded,
              source: "dependency_health",
            }}
          />
          <AdminMetricCard
            label={isFa ? "بدون ابزار" : "Not instrumented"}
            metric={{
              status: "available",
              value: notInstrumented,
              source: "dependency_health",
            }}
          />
        </div>
      </AdminSection>
      <InfrastructureOverviewPanel locale={locale} overview={overview} />
    </div>
  );
}
