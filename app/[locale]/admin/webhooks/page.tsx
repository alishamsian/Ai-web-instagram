import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, MetricUnavailable } from "@/components/admin/primitives";

export default async function AdminWebhooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "وب‌هوک‌ها" : "Webhooks"}
        description={
          isFa
            ? "بدون telemetry delivery — secrets هرگز نمایش داده نمی‌شوند"
            : "No delivery telemetry — secrets are never shown"
        }
      />
      <MetricUnavailable
        label={isFa ? "تلِمتری delivery وب‌هوک" : "Webhook delivery telemetry"}
        reason={
          isFa
            ? "تلِمتری delivery وب‌هوک در این مخزن ابزار نشده — نرخ موفقیت یا latency گزارش نمی‌شود"
            : "No webhook delivery telemetry in this repository — success rate and latency are not reported"
        }
      />
    </div>
  );
}
