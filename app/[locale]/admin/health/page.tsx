import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import { getCustomerIntelligence } from "@/lib/admin/phase6-queries";
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { adminHref } from "@/components/admin/nav";

export default async function AdminHealthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    plan?: string;
    health?: string;
    lifecycle?: string;
  }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const { rows, note } = await getCustomerIntelligence({
    userId,
    limit: 150,
    segment: {
      plan: sp.plan,
      health: sp.health,
      lifecycle: sp.lifecycle,
    },
  });
  const isFa = locale === "fa";
  const atRisk = rows.filter((r) => r.riskFlags.length > 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "سلامت مشتری" : "Customer Health"}
        description={note}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <AdminStatusBadge tone="success">
          healthy: {rows.filter((r) => r.healthCategory === "healthy").length}
        </AdminStatusBadge>
        <AdminStatusBadge tone="neutral">
          neutral: {rows.filter((r) => r.healthCategory === "neutral").length}
        </AdminStatusBadge>
        <AdminStatusBadge tone="warning">
          at_risk: {rows.filter((r) => r.healthCategory === "at_risk").length}
        </AdminStatusBadge>
        <AdminStatusBadge tone="danger">
          flagged: {atRisk.length}
        </AdminStatusBadge>
      </div>

      <AdminDataTable
        locale={locale}
        rows={rows.map((r) => ({ id: r.workspaceId, ...r }))}
        searchPlaceholder={isFa ? "جستجو…" : "Search…"}
        emptyTitle={isFa ? "داده نیست" : "No workspaces"}
        columns={[
          {
            id: "name",
            header: isFa ? "ورک‌اسپیس" : "Workspace",
            sortValue: (r) => r.name,
            cell: (r) => (
              <Link
                href={`${adminHref(locale, "/workspaces")}?focus=${r.workspaceId}`}
                className="underline-offset-2 hover:underline"
              >
                {r.name}
              </Link>
            ),
          },
          {
            id: "score",
            header: "Score",
            sortValue: (r) => r.healthScore ?? -1,
            cell: (r) =>
              r.healthScore == null ? (
                <span className="text-[var(--admin-muted)]">
                  Insufficient data
                </span>
              ) : (
                <span className="tabular-nums">{r.healthScore}</span>
              ),
          },
          {
            id: "health",
            header: isFa ? "دسته" : "Category",
            cell: (r) => (
              <AdminStatusBadge
                tone={
                  r.healthCategory === "healthy"
                    ? "success"
                    : r.healthCategory === "at_risk"
                      ? "danger"
                      : "neutral"
                }
              >
                {r.healthCategory}
              </AdminStatusBadge>
            ),
          },
          {
            id: "lifecycle",
            header: "Lifecycle",
            cell: (r) => r.lifecycle,
          },
          {
            id: "risk",
            header: isFa ? "ریسک" : "Risk",
            cell: (r) =>
              r.riskFlags.length === 0 ? (
                <span className="text-[var(--admin-muted)]">—</span>
              ) : (
                <ul className="max-w-xs space-y-1 text-[11px]">
                  {r.riskFlags.slice(0, 3).map((f) => (
                    <li key={f.code}>
                      <span className="font-medium">{f.severity}</span>: {f.reason}
                      <span className="block text-[var(--admin-muted)]">
                        {f.evidence}
                      </span>
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            id: "activity",
            header: isFa ? "آخرین فعالیت" : "Last activity",
            sortValue: (r) => r.daysSinceActivity ?? 9999,
            cell: (r) =>
              r.daysSinceActivity == null
                ? "—"
                : `${r.daysSinceActivity}d ago`,
          },
        ]}
      />
    </div>
  );
}
