import { requireAdminPage } from "@/lib/admin/gate";
import { getRevenueIntelligence } from "@/lib/admin/phase7-queries";
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
  const preset = (sp.range as DateRangePreset) || "30d";
  const [revenue, intel] = await Promise.all([
    getAdminRevenue({ userId, preset }),
    getRevenueIntelligence({ userId, preset }),
  ]);
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "درآمد" : "Revenue"}
        description={
          isFa
            ? intel.definition
            : intel.definition
        }
      />
      <AdminSection title={isFa ? "نمای کلی" : "Overview"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="MRR" metric={intel.mrr} style="currency" />
          <AdminMetricCard label="ARR" metric={intel.arr} style="currency" />
          <AdminMetricCard
            label={isFa ? "درآمد ناخالص" : "Gross revenue"}
            metric={intel.grossRevenue}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "بازپرداخت" : "Refunds"}
            metric={intel.refunds}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "درآمد خالص" : "Net revenue"}
            metric={intel.netRevenue}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "اشتراک فعال پولی" : "Active paid subs"}
            metric={intel.activePaidSubscriptions}
          />
          <AdminMetricCard
            label={isFa ? "پرداخت ناموفق" : "Failed payments"}
            metric={intel.failedPayments}
          />
          <AdminMetricCard
            label={isFa ? "سفارش‌ها (محصول)" : "Orders (product)"}
            comparable={revenue.orders}
          />
        </div>
        {intel.currency ? (
          <p className="mt-3 text-[11px] text-[var(--admin-muted)]">
            {isFa ? "ارز اصلی" : "Primary currency"}: {intel.currency}
          </p>
        ) : null}
      </AdminSection>

      <AdminSection
        title={isFa ? "حرکت MRR" : "MRR movement"}
        description={
          isFa
            ? "بدون تاریخچه انتقال اشتراک — عدد جعلی نمی‌سازیم"
            : "No subscription transition history — refusing invented figures"
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminMetricCard
            label={isFa ? "MRR جدید" : "New MRR"}
            metric={intel.newMrr}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "گسترش" : "Expansion"}
            metric={intel.expansionMrr}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "انقباض" : "Contraction"}
            metric={intel.contractionMrr}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "ریزش MRR" : "Churned MRR"}
            metric={intel.churnedMrr}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "فعال‌سازی مجدد" : "Reactivation MRR"}
            metric={intel.reactivationMrr}
            style="currency"
          />
        </div>
      </AdminSection>
    </div>
  );
}
