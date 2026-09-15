import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminDomainsList } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";

export default async function AdminDomainsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "websites.read");
  const rows = await getAdminDomainsList({ userId });
  const isFa = locale === "fa";
  return (
    <div className="space-y-6">
      <AdminPageHeader title={isFa ? "دامین‌ها" : "Domains"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder="host…"
        emptyTitle={isFa ? "دامینی نیست" : "No domains"}
        columns={[
          { id: "host", header: "Host", sortValue: (r) => r.host, cell: (r) => r.host },
          { id: "slug", header: "Website", cell: (r) => r.websiteSlug },
          { id: "status", header: "Site status", cell: (r) => <AdminStatusBadge tone={r.websiteStatus === "published" ? "success" : "neutral"}>{r.websiteStatus}</AdminStatusBadge> },
          { id: "health", header: "Health", cell: (r) => r.health },
          { id: "created", header: isFa ? "ایجاد" : "Created", sortValue: (r) => r.createdAt, cell: (r) => relativeTime(r.createdAt, locale) },
        ]}
      />
    </div>
  );
}
