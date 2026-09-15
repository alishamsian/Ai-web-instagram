import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, MetricUnavailable } from "@/components/admin/primitives";

export default async function AdminWebhooksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "وب‌هوک‌ها" : "Webhooks"} />
      <MetricUnavailable
        label="Webhook delivery telemetry"
        reason={locale === "fa" ? "تلِمتری delivery وب‌هوک هنوز ابزار نشده — secrets هرگز نمایش داده نمی‌شوند." : "Webhook delivery telemetry is not instrumented yet — secrets are never shown."}
      />
    </div>
  );
}
