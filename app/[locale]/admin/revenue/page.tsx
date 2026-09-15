import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminRevenue } from "@/lib/admin/queries";
import {
  AdminPageHeader,
  AdminSection,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import type { DateRangePreset } from "@/lib/admin/dates";

const FUTURE_METRICS = [
  { id: "arr", label: "ARR", reason: "Payment provider + MRR integration required" },
  { id: "new-mrr", label: "New MRR", reason: "Payment provider integration required" },
  { id: "expansion", label: "Expansion", reason: "Plan upgrade amount tracking required" },
  { id: "contraction", label: "Contraction", reason: "Plan downgrade amount tracking required" },
  { id: "churn", label: "Churn (revenue)", reason: "Cancellation + amount instrumentation required" },
  { id: "refunds", label: "Refunds", reason: "Refund ledger / payment provider required" },
  { id: "arpu", label: "ARPU", reason: "Revenue + active customer count required" },
  { id: "ltv", label: "LTV", reason: "Cohort revenue instrumentation required" },
  { id: "cac", label: "CAC", reason: "Acquisition spend integration required" },
] as const;

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
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "درآمد" : "Revenue"}
        description={
          isFa
            ? "معماری آماده برای Stripe/payment — بدون عدد جعلی"
            : "Architecture ready for Stripe/payment — no invented figures"
        }
      />
      <AdminSection title={isFa ? "نمای کلی" : "Overview"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="MRR" metric={revenue.mrr} style="currency" />
          <AdminMetricCard
            label={isFa ? "درآمد" : "Revenue"}
            metric={revenue.revenue}
            style="currency"
          />
          <AdminMetricCard
            label={isFa ? "سفارش‌ها" : "Orders"}
            comparable={revenue.orders}
          />
          <AdminMetricCard
            label={isFa ? "سفارش پرداخت‌شده" : "Paid Orders"}
            metric={revenue.paidOrders}
          />
        </div>
      </AdminSection>
      <AdminSection title={isFa ? "آماده‌سازی آینده" : "Future-ready slots"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FUTURE_METRICS.map((m) => (
            <MetricUnavailable key={m.id} label={m.label} reason={m.reason} />
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
