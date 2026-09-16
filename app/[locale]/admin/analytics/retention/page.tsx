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
            ? `Cohort بر اساس تاریخ signup. ${data.activityDefinition}`
            : `Cohort basis: ${data.cohortBasis}. ${data.activityDefinition}`
        }
      />

      <AdminCard>
        <h3 className="text-sm font-medium text-[var(--admin-fg)]">
          {isFa ? "نگه‌داشت روزانه" : "Day retention"}
        </h3>
        {data.days.length === 0 ? (
          <div className="mt-3">
            <MetricUnavailable
              label="Retention"
              reason={
                isFa ? "داده کافی نیست" : "Insufficient or no cohort data"
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
                {d.status === "insufficient_data" ? (
                  <p className="mt-1 text-sm text-[var(--admin-muted)]">
                    Insufficient data
                  </p>
                ) : (
                  <p className="mt-1 tabular-nums text-lg text-[var(--admin-fg)]">
                    {pct(d.rate)}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                  n={d.cohortSize}
                  {d.retained != null ? ` · retained=${d.retained}` : ""}
                </p>
                <AdminStatusBadge
                  tone={
                    d.status === "available" ? "success" : "neutral"
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
              {w.status === "insufficient_data" ? (
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  Insufficient data
                </p>
              ) : (
                <p className="mt-1 tabular-nums text-lg text-[var(--admin-fg)]">
                  {pct(w.rate)}
                </p>
              )}
              <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                n={w.cohortSize}
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
