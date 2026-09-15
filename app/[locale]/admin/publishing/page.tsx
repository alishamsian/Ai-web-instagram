import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminPublishingList } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminPublishingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const items = await getAdminPublishingList({ userId });
  const rows = items.map((p) => ({
    id: p.id as string,
    status: (p.status as string) ?? "",
    scheduled_at: (p.scheduled_at as string | null) ?? null,
    published_at: (p.published_at as string | null) ?? null,
    error: (p.error as string | null) ?? null,
    created_at: p.created_at as string,
  }));
  const isFa = locale === "fa";
  return (
    <div className="space-y-6">
      <AdminPageHeader title={isFa ? "انتشار" : "Publishing"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="status…"
        emptyTitle={isFa ? "انتشاری نیست" : "No publications"}
        columns={[
          { id: "id", header: "ID", cell: (r) => <span className="font-mono text-[11px]">{r.id.slice(0, 8)}…</span> },
          { id: "status", header: "Status", cell: (r) => <AdminStatusBadge tone={r.status === "failed" ? "danger" : r.status === "published" ? "success" : "neutral"}>{r.status}</AdminStatusBadge> },
          { id: "scheduled", header: "Scheduled", cell: (r) => (r.scheduled_at ? relativeTime(r.scheduled_at, locale) : "—") },
          { id: "published", header: "Published", cell: (r) => (r.published_at ? relativeTime(r.published_at, locale) : "—") },
          { id: "error", header: "Error", cell: (r) => r.error?.slice(0, 80) || "—" },
        ]}
      />
    </div>
  );
}
