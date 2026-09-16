import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminDashboardKpisLite } from "@/lib/admin/dashboard-lite";
import { getAdminDashboardSystemStrip } from "@/lib/admin/dashboard-strip";
import { getAdminOpsDashboardSignals } from "@/lib/admin/phase5-queries";
import { getFounderInsightsLite } from "@/lib/admin/phase6-queries";
import { getFounderBillingSummary } from "@/lib/admin/phase7-queries";
import { FounderDashboardLite } from "@/components/admin/FounderDashboardLite";
import { settledValue } from "@/lib/admin/safe";
import { resolveDateRange, resolveComparisonPeriod, type DateRangePreset } from "@/lib/admin/dates";
import type { DashboardKpis, MetricResult, ComparableMetric } from "@/lib/admin/contracts";
import type { InfrastructureOverview } from "@/lib/admin/phase4-contracts";
import type { OpsDashboardSignals } from "@/lib/admin/phase5-contracts";
import type { FounderInsight } from "@/lib/admin/intelligence/founder-insights";
import type { FounderBillingSummary } from "@/lib/admin/phase7-queries";

function u(reason = "Temporarily unavailable"): MetricResult<number> {
  return { status: "unavailable", reason };
}
function c(reason = "Temporarily unavailable"): ComparableMetric {
  const m = u(reason);
  return { current: m, previous: m, deltaRatio: m };
}

function emptyKpis(preset: DateRangePreset): DashboardKpis {
  const range = resolveDateRange({ preset });
  return {
    range,
    comparison: resolveComparisonPeriod(range),
    newUsers: c(),
    activeUsers: c(),
    websitesCreated: c(),
    websitesPublished: c(),
    imports: c(),
    successfulImports: c(),
    failedImports: c(),
    aiRequests: c(),
    aiCost: c(),
    orders: c(),
    mrr: u(),
    revenue: u(),
    pageViews: c(),
    subscriptionsStarted: c(),
  };
}

function emptyInfra(): InfrastructureOverview {
  const m = u();
  return {
    systemStatus: "unknown",
    systemStatusReason: "System strip temporarily unavailable",
    failedJobs24h: m,
    staleJobs: m,
    queueDepth: m,
    openAlerts: m,
    criticalAlerts: m,
    aiErrorRate: m,
    dependencies: [],
    attention: [],
  };
}

function emptyOps(): OpsDashboardSignals {
  const m = u();
  return {
    openIncidents: m,
    criticalErrorGroups: m,
    securityEvents24h: m,
    cronFailures24h: m,
  };
}

function emptyBilling(): FounderBillingSummary {
  const m = u("Temporarily unavailable");
  return {
    mrr: m,
    paidWorkspaces: m,
    failedPayments7d: m,
    webhookFailed7d: m,
    atRiskPastDue: m,
  };
}

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

  const [kpisSettled, infraSettled, opsSettled, insightsSettled, billingSettled] =
    await Promise.allSettled([
      settledValue(
        "dashboard.kpis",
        getAdminDashboardKpisLite({ userId, preset }),
        emptyKpis(preset),
      ),
      settledValue(
        "dashboard.strip",
        getAdminDashboardSystemStrip({ userId }),
        emptyInfra(),
      ),
      settledValue(
        "dashboard.opsSignals",
        getAdminOpsDashboardSignals({ userId }),
        emptyOps(),
      ),
      settledValue(
        "dashboard.insights",
        getFounderInsightsLite({ userId }),
        {
          insights: [] as FounderInsight[],
          note: "unavailable",
          atRisk: { status: "unavailable" as const, reason: "Temporarily unavailable" },
        },
      ),
      settledValue(
        "dashboard.billing",
        getFounderBillingSummary({ userId }),
        emptyBilling(),
      ),
    ]);

  const kpis =
    kpisSettled.status === "fulfilled" ? kpisSettled.value.value : emptyKpis(preset);
  const infra =
    infraSettled.status === "fulfilled" ? infraSettled.value.value : emptyInfra();
  const ops =
    opsSettled.status === "fulfilled" ? opsSettled.value.value : emptyOps();
  const insightsResult =
    insightsSettled.status === "fulfilled"
      ? insightsSettled.value.value
      : {
          insights: [] as FounderInsight[],
          note: "unavailable",
          atRisk: {
            status: "unavailable" as const,
            reason: "Temporarily unavailable",
          },
        };
  const billing =
    billingSettled.status === "fulfilled"
      ? billingSettled.value.value
      : emptyBilling();
  const insights = insightsResult.insights;
  return (
    <FounderDashboardLite
      locale={locale}
      role={actor.role}
      kpis={kpis}
      infra={infra}
      ops={ops}
      insights={insights}
      atRisk={insightsResult.atRisk}
      billing={billing}
    />
  );
}
