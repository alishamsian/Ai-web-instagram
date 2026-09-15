import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminWorkspacesEnriched } from "@/lib/admin/phase3-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HealthBadge, HealthSignalList } from "@/components/admin/phase3/HealthBadge";
import { adminHref } from "@/components/admin/nav";

export default async function AdminHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const { rows } = await getAdminWorkspacesEnriched({ userId, limit: 200 });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "سلامت مشتری" : "Customer Health"}
        description={
          isFa
            ? "چارچوب قانون‌محور — بدون امتیاز churn جعلی"
            : "Transparent rule-based framework — no fake churn scores"
        }
      />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={isFa ? "جستجو…" : "Search…"}
        emptyTitle={isFa ? "داده نیست" : "No workspaces"}
        columns={[
          {
            id: "name",
            header: isFa ? "ورک‌اسپیس" : "Workspace",
            sortValue: (r) => r.name,
            cell: (r) => (
              <Link href={`${adminHref(locale, "/workspaces")}?focus=${r.id}`} className="underline-offset-2 hover:underline">
                {r.name}
              </Link>
            ),
          },
          {
            id: "health",
            header: isFa ? "سطح" : "Level",
            cell: (r) => <HealthBadge health={r.health} locale={locale} />,
          },
          {
            id: "summary",
            header: isFa ? "خلاصه" : "Summary",
            cell: (r) => (
              <div className="max-w-md">
                <p className="text-xs text-[var(--admin-muted)]">{r.health.summary}</p>
                <div className="mt-2">
                  <HealthSignalList health={r.health} locale={locale} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
