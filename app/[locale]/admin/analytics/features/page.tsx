import { requireAdminPage } from "@/lib/admin/gate";
import { getFeatureAdoptionIntelligence } from "@/lib/admin/phase6-queries";
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";

function pct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export default async function AdminFeaturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const data = await getFeatureAdoptionIntelligence({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
  });
  const isFa = locale === "fa";
  const rows = data.features.map((f) => ({
    ...f,
    id: f.id,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "پذیرش فیچر" : "Feature Adoption"}
        description={
          isFa
            ? "فقط فیچرهایی با منبع داده قابل اتکا"
            : "Only features with reliable evidence sources"
        }
      />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="feature…"
        emptyTitle={isFa ? "فیچری نیست" : "No features"}
        columns={[
          {
            id: "label",
            header: isFa ? "فیچر" : "Feature",
            cell: (r) => (
              <div>
                <p>{r.label}</p>
                <p className="text-[11px] text-[var(--admin-muted)]">{r.source}</p>
              </div>
            ),
          },
          {
            id: "eligible",
            header: "Eligible",
            sortValue: (r) => r.eligible ?? -1,
            cell: (r) => (r.eligible == null ? "—" : r.eligible),
          },
          {
            id: "adopters",
            header: "Adopters",
            sortValue: (r) => r.adopters ?? -1,
            cell: (r) => (r.adopters == null ? "—" : r.adopters),
          },
          {
            id: "rate",
            header: "Adoption",
            sortValue: (r) => r.adoptionRate ?? -1,
            cell: (r) => pct(r.adoptionRate),
          },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <div>
                <AdminStatusBadge
                  tone={
                    r.status === "available"
                      ? "success"
                      : r.status === "partial"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {r.status}
                </AdminStatusBadge>
                {r.reason ? (
                  <p className="mt-1 max-w-xs text-[11px] text-[var(--admin-muted)]">
                    {r.reason}
                  </p>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
