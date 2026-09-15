import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminImports } from "@/lib/admin/queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";
import { relativeTime } from "@/components/admin/format";

export default async function AdminImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "imports.read");
  const imports = await getAdminImports({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    limit: 100,
  });
  const rows = imports.map((item) => ({
    id: item.id as string,
    username: (item.username as string) ?? "",
    scrape_status: (item.scrape_status as string) ?? "",
    collector: (item.collector as string) ?? "",
    updated_at: item.updated_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "ایمپورت‌ها" : "Imports"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="@username"
        emptyTitle={locale === "fa" ? "ایمپورتی نیست" : "No imports"}
        columns={[
          {
            id: "username",
            header: "Username",
            sortValue: (r) => r.username,
            cell: (r) => `@${r.username}`,
          },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <AdminStatusBadge tone="neutral">{r.scrape_status}</AdminStatusBadge>
            ),
          },
          {
            id: "collector",
            header: "Collector",
            cell: (r) => r.collector,
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
