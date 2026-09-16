import { requireAdminPage } from "@/lib/admin/gate";
import { getCohortTable } from "@/lib/admin/phase6-queries";
import {
  AdminPageHeader,
  AdminCard,
  MetricUnavailable,
} from "@/components/admin/primitives";

function cellText(rate: number | null, status: string) {
  if (status === "insufficient_data") return "Insufficient data";
  if (status === "pending" || rate == null) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

export default async function AdminCohortsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const data = await getCohortTable({
    userId,
    preset: (sp.range as "7d" | "30d" | "90d") || "90d",
  });
  const isFa = locale === "fa";
  const weeks = [0, 1, 2, 3, 4, 8, 12];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "هم‌گروه‌ها" : "Cohorts"}
        description={data.note}
      />
      {data.rows.length === 0 ? (
        <MetricUnavailable
          label="Cohort table"
          reason={
            isFa
              ? "هم‌گروهی در بازه انتخاب‌شده نیست"
              : "No signup cohorts in selected range"
          }
        />
      ) : (
        <AdminCard className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                <th className="px-2 py-2 font-medium">
                  {isFa ? "هفته signup" : "Signup week"}
                </th>
                <th className="px-2 py-2 font-medium">Size</th>
                {weeks.map((w) => (
                  <th key={w} className="px-2 py-2 font-medium">
                    W{w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr
                  key={row.weekKey}
                  className="border-b border-[var(--admin-border)]/60"
                >
                  <td className="px-2 py-2 text-[var(--admin-fg)]">
                    {row.weekKey}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{row.size}</td>
                  {row.cells.map((c) => (
                    <td
                      key={c.week}
                      className="px-2 py-2 tabular-nums text-[var(--admin-muted)]"
                    >
                      {cellText(c.rate, c.status)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}
    </div>
  );
}
