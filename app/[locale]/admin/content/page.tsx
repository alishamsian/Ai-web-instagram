import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminContentList } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminContentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const items = await getAdminContentList({ userId });
  const rows = items.map((c) => ({
    id: c.id as string,
    type: (c.type as string) ?? "",
    source: (c.source as string) ?? "",
    title: (c.title as string) ?? "",
    status: (c.status as string) ?? "",
    created_at: c.created_at as string,
  }));
  const isFa = locale === "fa";
  return (
    <div className="space-y-6">
      <AdminPageHeader title={isFa ? "محتوا" : "Content"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={isFa ? "جستجو…" : "Search…"}
        emptyTitle={isFa ? "محتوایی نیست" : "No content"}
        columns={[
          { id: "title", header: isFa ? "عنوان" : "Title", cell: (r) => r.title || "—" },
          { id: "type", header: "Type", cell: (r) => r.type },
          { id: "source", header: "Source", cell: (r) => r.source },
          { id: "status", header: "Status", cell: (r) => <AdminStatusBadge tone="neutral">{r.status || "—"}</AdminStatusBadge> },
          { id: "created", header: isFa ? "ایجاد" : "Created", sortValue: (r) => r.created_at, cell: (r) => relativeTime(r.created_at, locale) },
        ]}
      />
    </div>
  );
}
