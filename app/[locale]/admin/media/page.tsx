import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminMediaList } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminSection } from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminMediaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "workspaces.read");
  const { metrics, rows } = await getAdminMediaList({ userId });
  const isFa = locale === "fa";
  return (
    <div className="space-y-6">
      <AdminPageHeader title={isFa ? "مدیا" : "Media"} />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard label={isFa ? "تعداد فایل" : "Asset count"} metric={metrics.assetCount} />
          <AdminMetricCard label={isFa ? "حجم ذخیره‌سازی" : "Storage bytes"} metric={metrics.storageBytes} />
        </div>
      </AdminSection>
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="id / type…"
        emptyTitle={isFa ? "فایلی نیست" : "No media"}
        columns={[
          { id: "id", header: "ID", cell: (r) => <span className="font-mono text-[11px]">{r.id.slice(0, 8)}…</span> },
          { id: "type", header: "Type", cell: (r) => r.type },
          { id: "ws", header: "Workspace", cell: (r) => <span className="font-mono text-[11px]">{r.workspaceId.slice(0, 8)}…</span> },
          { id: "url", header: "URL", cell: (r) => (r.publicUrl ? <a href={r.publicUrl} className="underline-offset-2 hover:underline" target="_blank" rel="noreferrer">open</a> : "—") },
          { id: "created", header: isFa ? "ایجاد" : "Created", sortValue: (r) => r.createdAt, cell: (r) => relativeTime(r.createdAt, locale) },
        ]}
      />
    </div>
  );
}
