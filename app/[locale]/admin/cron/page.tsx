import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, MetricUnavailable, AdminCard } from "@/components/admin/primitives";

export default async function AdminCronPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Cron" description={isFa ? "فقط jobهای واقعی — بدون uptime جعلی Vercel" : "Only real jobs — no fake Vercel cron uptime"} />
      <AdminCard>
        <p className="text-sm text-[var(--admin-fg)]">publishing/process-due · jobs/process</p>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          {isFa ? "اجرای موفق/ناموفق از روی لاگ‌های runtime قابل مشاهده است؛ جدول cron telemetry وجود ندارد." : "Success/failure is observable via runtime logs; no dedicated cron telemetry table."}
        </p>
      </AdminCard>
      <MetricUnavailable label="Last run / next run" reason="Cron execution health telemetry not stored in database" />
    </div>
  );
}
