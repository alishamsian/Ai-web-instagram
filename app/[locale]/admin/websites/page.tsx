import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminWebsitesEnriched } from "@/lib/admin/phase3-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { HealthBadge } from "@/components/admin/phase3/HealthBadge";
import { relativeTime } from "@/components/admin/format";
import { adminHref } from "@/components/admin/nav";

export default async function AdminWebsitesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "websites.read");
  const { metrics, rows } = await getAdminWebsitesEnriched({
    userId,
    limit: 100,
  });
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader title={isFa ? "سایت‌ها" : "Websites"} />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label={isFa ? "کل" : "Total"} metric={metrics.total} />
          <AdminMetricCard
            label={isFa ? "منتشر" : "Published"}
            metric={metrics.published}
          />
          <AdminMetricCard
            label={isFa ? "پیش‌نویس" : "Unpublished"}
            metric={metrics.unpublished}
          />
          <AdminMetricCard
            label={isFa ? "دامین" : "With domain"}
            metric={metrics.withDomain}
          />
        </div>
      </AdminSection>
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="slug…"
        emptyTitle={isFa ? "سایتی نیست" : "No websites"}
        columns={[
          {
            id: "slug",
            header: "Slug",
            sortValue: (r) => r.slug,
            cell: (r) => (
              <div>
                <p className="font-medium">{r.slug}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  <Link
                    href={`/${locale}/editor/${r.id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    Editor
                  </Link>
                  <Link
                    href={`${adminHref(locale, "/workspaces")}?focus=${r.workspaceId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    Workspace
                  </Link>
                </div>
              </div>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <AdminStatusBadge
                tone={r.status === "published" ? "success" : "neutral"}
              >
                {r.status}
              </AdminStatusBadge>
            ),
          },
          {
            id: "domain",
            header: "Domain",
            cell: (r) => r.domainHost ?? "—",
          },
          {
            id: "views",
            header: "Views",
            sortValue: (r) => r.pageViews ?? -1,
            cell: (r) =>
              r.pageViews == null ? (
                <span className="text-[var(--admin-muted)]" title="Exact page-view total unavailable for this sample">
                  —
                </span>
              ) : (
                r.pageViews
              ),
          },
          {
            id: "health",
            header: isFa ? "سلامت" : "Health",
            cell: (r) => <HealthBadge health={r.health} locale={locale} />,
          },
          {
            id: "updated",
            header: isFa ? "به‌روز" : "Updated",
            sortValue: (r) => r.updatedAt,
            cell: (r) => relativeTime(r.updatedAt, locale),
          },
        ]}
      />
    </div>
  );
}
