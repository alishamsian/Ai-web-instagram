import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminOrders } from "@/lib/admin/queries";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";
import { relativeTime } from "@/components/admin/format";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "orders.read");
  const orders = await getAdminOrders({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    limit: 100,
  });
  const rows = orders.map((o) => ({
    id: o.id as string,
    status: (o.status as string) ?? "",
    channel: (o.channel as string) ?? "",
    created_at: o.created_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "سفارش‌ها" : "Orders"} />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={locale === "fa" ? "جستجو…" : "Search…"}
        emptyTitle={locale === "fa" ? "سفارشی نیست" : "No orders"}
        columns={[
          {
            id: "id",
            header: "ID",
            cell: (r) => (
              <span className="font-mono text-[11px]">{r.id.slice(0, 8)}…</span>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <AdminStatusBadge tone="neutral">{r.status}</AdminStatusBadge>
            ),
          },
          {
            id: "channel",
            header: "Channel",
            cell: (r) => r.channel || "—",
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
