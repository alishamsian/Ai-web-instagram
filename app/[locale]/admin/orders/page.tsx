import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminOrders } from "@/lib/admin/queries";
import {
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";
import { relativeTime } from "@/components/admin/format";
import { AdminExportLink } from "@/components/admin/AdminExportLink";
import Link from "next/link";
import { adminHref } from "@/components/admin/nav";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; focus?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "orders.read");
  const orders = await getAdminOrders({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    limit: 100,
  });
  const isFa = locale === "fa";
  const rows = orders.map((o) => ({
    id: o.id as string,
    status: (o.status as string) ?? "",
    channel: (o.channel as string) ?? "",
    workspace_id: (o.workspace_id as string | null) ?? null,
    website_id: (o.website_id as string | null) ?? null,
    created_at: o.created_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "سفارش‌ها" : "Orders"}
        description={
          isFa
            ? "از store_orders — بدون دادهٔ پرداخت حساس"
            : "From store_orders — no sensitive payment payloads"
        }
        actions={<AdminExportLink entity="orders" />}
      />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={isFa ? "جستجو…" : "Search…"}
        emptyTitle={isFa ? "سفارشی نیست" : "No orders"}
        columns={[
          {
            id: "id",
            header: "ID",
            cell: (r) => (
              <div>
                <span className="font-mono text-[11px]">{r.id.slice(0, 8)}…</span>
                <div className="mt-1 flex gap-2 text-[11px]">
                  {r.workspace_id ? (
                    <Link
                      href={`${adminHref(locale, "/workspaces")}?focus=${r.workspace_id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      Workspace
                    </Link>
                  ) : null}
                  {r.website_id ? (
                    <Link
                      href={`${adminHref(locale, "/websites")}?focus=${r.website_id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      Website
                    </Link>
                  ) : null}
                </div>
              </div>
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
            header: isFa ? "ایجاد" : "Created",
            sortValue: (r) => r.created_at,
            cell: (r) => relativeTime(r.created_at, locale),
          },
        ]}
      />
    </div>
  );
}
