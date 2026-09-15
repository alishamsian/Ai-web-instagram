import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminDashboardKpisLite } from "@/lib/admin/dashboard-lite";
import { getAdminDashboardSystemStrip } from "@/lib/admin/dashboard-strip";
import { FounderDashboardLite } from "@/components/admin/FounderDashboardLite";
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

  // Founder home is intentionally bounded: two server queries only.
  // Heavy AI/activity/series analytics live on their dedicated pages.
  const [kpis, infra] = await Promise.all([
    getAdminDashboardKpisLite({ userId, preset }),
    getAdminDashboardSystemStrip({ userId }),
  ]);

  return (
    <FounderDashboardLite
      locale={locale}
      role={actor.role}
      kpis={kpis}
      infra={infra}
    />
  );
}
