import { requireAdminPage } from "@/lib/admin/gate";
import {
  getAdminActivity,
  getAdminAIUsage,
  getAdminAlerts,
  getAdminDashboardMetrics,
  getAdminImportMetrics,
  getAdminMetricSeries,
  getAdminSystemHealth,
} from "@/lib/admin/queries";
import {
  getAdminInfrastructureOverview,
  getAdminObservabilityTimeline,
} from "@/lib/admin/phase4-queries";
import { FounderDashboard } from "@/components/admin/FounderDashboard";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { actor, locale, userId } = await requireAdminPage(raw, "system.read");
  const preset = (sp.range as DateRangePreset) || "30d";
  const rangeInput = { userId, preset };

  const [
    kpis,
    ai,
    imports,
    health,
    alerts,
    activity,
    users,
    websites,
    published,
    aiSeries,
    importSeries,
    infra,
    timeline,
  ] = await Promise.all([
    getAdminDashboardMetrics(rangeInput),
    getAdminAIUsage(rangeInput),
    getAdminImportMetrics(rangeInput),
    getAdminSystemHealth({ userId }),
    getAdminAlerts({ userId, limit: 20 }),
    getAdminActivity({ ...rangeInput, limit: 30 }),
    getAdminMetricSeries({ ...rangeInput, column: "new_users" }),
    getAdminMetricSeries({ ...rangeInput, column: "websites_created" }),
    getAdminMetricSeries({ ...rangeInput, column: "websites_published" }),
    getAdminMetricSeries({ ...rangeInput, column: "ai_requests" }),
    getAdminMetricSeries({ ...rangeInput, column: "imports" }),
    getAdminInfrastructureOverview({ userId }),
    getAdminObservabilityTimeline({ userId, limit: 25 }),
  ]);

  return (
    <FounderDashboard
      locale={locale}
      role={actor.role}
      kpis={kpis}
      ai={ai}
      imports={imports}
      health={health}
      alerts={alerts}
      activity={activity}
      series={{
        users,
        websites,
        published,
        ai: aiSeries,
        imports: importSeries,
      }}
      infra={infra}
      timeline={timeline}
    />
  );
}
