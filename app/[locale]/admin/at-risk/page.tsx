import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAtRiskWorkspaces } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminEmptyState } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HealthBadge } from "@/components/admin/phase3/HealthBadge";
import { adminHref } from "@/components/admin/nav";

export default async function AdminAtRiskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const rows = await getAdminAtRiskWorkspaces({ userId });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "در خطر — سیگنال قانون‌محور" : "At Risk — rule-based signals"}
        description={
          isFa
            ? "فقط ورک‌اسپیس‌هایی با سیگنال needs_attention / blocked / at_risk"
            : "Only workspaces with needs_attention / blocked / at_risk signals"
        }
      />
      {!rows.length ? (
        <AdminEmptyState
          title={isFa ? "مورد در خطری نیست" : "No at-risk workspaces"}
          body={isFa ? "هیچ سیگنال قانون‌محور منفی فعالی نیست." : "No adverse rule-based signals right now."}
        />
      ) : (
        <AdminDataTable
          locale={locale}
          rows={rows}
          searchPlaceholder={isFa ? "جستجو…" : "Search…"}
          emptyTitle=""
          columns={[
            {
              id: "name",
              header: isFa ? "ورک‌اسپیس" : "Workspace",
              cell: (r) => (
                <Link href={`${adminHref(locale, "/workspaces")}?focus=${r.id}`} className="underline-offset-2 hover:underline">
                  {r.name}
                </Link>
              ),
            },
            {
              id: "health",
              header: isFa ? "سلامت" : "Health",
              cell: (r) => <HealthBadge health={r.health} locale={locale} />,
            },
            {
              id: "evidence",
              header: isFa ? "شواهد" : "Evidence",
              cell: (r) => r.health.signals.map((s) => s.evidence).join(" · ") || "—",
            },
          ]}
        />
      )}
    </div>
  );
}
