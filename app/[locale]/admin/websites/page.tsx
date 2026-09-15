import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminWebsites } from "@/lib/admin/queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminWebsitesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "websites.read");
  const websites = await getAdminWebsites({ userId, limit: 100 });
  const rows = websites.map((w) => ({
    id: w.id as string,
    slug: (w.slug as string) ?? "",
    status: (w.status as string) ?? "",
    version: Number(w.version ?? 0),
    updated_at: w.updated_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "سایت‌ها" : "Websites"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={locale === "fa" ? "جستجوی slug…" : "Search slug…"}
        emptyTitle={locale === "fa" ? "سایتی نیست" : "No websites"}
        columns={[
          {
            id: "slug",
            header: "Slug",
            sortValue: (r) => r.slug,
            cell: (r) => r.slug,
          },
          {
            id: "status",
            header: "Status",
            sortValue: (r) => r.status,
            cell: (r) => (
              <AdminStatusBadge
                tone={r.status === "published" ? "success" : "neutral"}
              >
                {r.status}
              </AdminStatusBadge>
            ),
          },
          {
            id: "version",
            header: "Ver",
            sortValue: (r) => r.version,
            cell: (r) => r.version,
          },
          {
            id: "updated",
            header: locale === "fa" ? "به‌روز" : "Updated",
            sortValue: (r) => r.updated_at,
            cell: (r) => relativeTime(r.updated_at, locale),
          },
        ]}
      />
    </div>
  );
}
