import { requireAdminPage } from "@/lib/admin/gate";
import { getRetentionIntelligence } from "@/lib/admin/phase6-queries";
import {
  AdminPageHeader,
  AdminCard,
  MetricUnavailable,
  AdminStatusBadge,
} from "@/components/admin/primitives";

function pct(n: number | null) {
  if (n == null) return null;
  return `${(n * 100).toFixed(1)}%`;
}

function cellLabel(status: string, rate: number | null) {
  if (status === "pending") return "Pending (not mature)";
  if (status === "insufficient_data") return "Insufficient data";
  if (status === "error") return "Error";
  if (status === "partial") return `${pct(rate)} (partial)`;
  return pct(rate);
}

export default async function AdminRetentionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const data = await getRetentionIntelligence({
    userId,
    preset: (sp.range as "7d" | "30d" | "90d") || "30d",
  });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "نگه‌داشت" : "Retention"}
        description={
          isFa
            ? `Cohort بر اساس تاریخ signup (UTC). ${data.activityDefinition}`
            : `Cohort basis: ${data.cohortBasis} (UTC). Cutoff: ${data.cutoffAt}. ${data.activityDefinition}`
        }
      />

      {data.status === "unavailable" || data.status === "error" ? (
        <MetricUnavailable
          label="Retention"
          reason={data.reason ?? data.status}
        />
      ) : null}

      <AdminCard>
        <h3 className="text-sm font-medium text-[var(--admin-fg)]">
          {isFa ? "نگه‌داشت روزانه" : "Day retention"}
        </h3>
        {data.days.length === 0 ? (
          <div className="mt-3">
            <MetricUnavailable
              label="Retention"
              reason={
                data.reason ??
                (isFa ? "داده کافی نیست" : "Insufficient or no cohort data")
              }
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.days.map((d) => (
              <div
                key={d.day}
                className="rounded-lg border border-[var(--admin-border)] p-3"
              >
                <p className="text-xs text-[var(--admin-muted)]">Day {d.day}</p>
                <p className="mt-1 text-sm text-[var(--admin-fg)]">
                  {cellLabel(d.status, d.rate)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                  cohort={d.cohortSize} · mature={d.matureSize}
                  {d.retained != null ? ` · retained=${d.retained}` : ""}
                </p>
                <AdminStatusBadge
                  tone={
                    d.status === "available"
                      ? "success"
                      : d.status === "pending"
                        ? "info"
                        : "neutral"
                  }
                >
                  {d.status}
                </AdminStatusBadge>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard>
        <h3 className="text-sm font-medium text-[var(--admin-fg)]">
          {isFa ? "نگه‌داشت هفتگی" : "Weekly retention"}
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.weekly.map((w) => (
            <div
              key={w.week}
              className="rounded-lg border border-[var(--admin-border)] p-3"
            >
              <p className="text-xs text-[var(--admin-muted)]">W{w.week}</p>
              <p className="mt-1 text-sm text-[var(--admin-fg)]">
                {cellLabel(w.status, w.rate)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                cohort={w.cohortSize} · mature={w.matureSize}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
