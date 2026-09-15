import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminWorkspaces } from "@/lib/admin/queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminWorkspacesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const workspaces = await getAdminWorkspaces({ userId, limit: 100 });
  const rows = workspaces.map((w) => ({
    id: w.id as string,
    name: (w.name as string) ?? "",
    plan: (w.plan as string) ?? "free",
    owner_id: (w.owner_id as string) ?? "",
    created_at: w.created_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "ورک‌اسپیس‌ها" : "Workspaces"}
      />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={locale === "fa" ? "جستجو…" : "Search…"}
        emptyTitle={locale === "fa" ? "ورک‌اسپیسی نیست" : "No workspaces"}
        columns={[
          {
            id: "name",
            header: locale === "fa" ? "نام" : "Name",
            sortValue: (r) => r.name,
            cell: (r) => r.name,
          },
          {
            id: "plan",
            header: "Plan",
            sortValue: (r) => r.plan,
            cell: (r) => (
              <AdminStatusBadge tone="neutral">{r.plan}</AdminStatusBadge>
            ),
          },
          {
            id: "owner",
            header: "Owner",
            cell: (r) => (
              <span className="font-mono text-[11px]">
                {r.owner_id.slice(0, 8)}…
              </span>
            ),
          },
          {
            id: "created",
            header: locale === "fa" ? "ایجاد" : "Created",
            sortValue: (r) => r.created_at,
            cell: (r) => relativeTime(r.created_at, locale),
          },
        ]}
      />
    </div>
  );
}
