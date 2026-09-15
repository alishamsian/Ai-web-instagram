import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminRevenue } from "@/lib/admin/queries";
import {
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminRevenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "billing.read");
  const revenue = await getAdminRevenue({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "درآمد" : "Revenue"}
        description={
          locale === "fa"
            ? "مبالغ پولی فقط پس از اتصال payment provider نمایش داده می‌شوند."
            : "Monetary figures stay unavailable until a payment provider is wired."
        }
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="MRR" metric={revenue.mrr} style="currency" />
          <AdminMetricCard
            label={locale === "fa" ? "درآمد" : "Revenue"}
            metric={revenue.revenue}
            style="currency"
          />
          <AdminMetricCard
            label={locale === "fa" ? "سفارش‌ها" : "Orders"}
            comparable={revenue.orders}
          />
          <AdminMetricCard
            label={locale === "fa" ? "سفارش پرداخت‌شده" : "Paid Orders"}
            metric={revenue.paidOrders}
          />
        </div>
      </AdminSection>
    </div>
  );
}
