import { requireAdminPage } from "@/lib/admin/gate";
import { getConfiguredCronSchedules } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";

export default async function AdminCronPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  const schedules = getConfiguredCronSchedules();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cron"
        description={
          isFa
            ? "فقط زمان‌بندی پیکربندی‌شده — تاریخچه اجرا در DB ذخیره نمی‌شود"
            : "Configured schedule only — execution history not stored in DB"
        }
      />
      <AdminSection title={isFa ? "زمان‌بندی‌ها" : "Schedules"}>
        <AdminDataTable
          locale={locale}
          rows={schedules}
          searchPlaceholder="name…"
          emptyTitle={isFa ? "زمان‌بندی‌ای نیست" : "No schedules"}
          columns={[
            { id: "name", header: isFa ? "نام" : "Name", cell: (r) => r.name },
            { id: "path", header: "Path", cell: (r) => r.path },
            {
              id: "configured",
              header: isFa ? "زمان‌بندی پیکربندی‌شده" : "Configured schedule",
              cell: (r) => (
                <span className="text-xs text-[var(--admin-muted)]">
                  {r.configuredSchedule}
                </span>
              ),
            },
            {
              id: "history",
              header: isFa ? "تاریخچه اجرا" : "Execution history",
              cell: (r) => {
                const hist = r.executionHistory;
                const reason =
                  hist.status === "unavailable" ||
                  hist.status === "error" ||
                  hist.status === "insufficient_sample"
                    ? hist.reason
                    : hist.status === "partial"
                      ? hist.warning
                      : "Unavailable";
                return (
                  <span
                    className="text-xs text-[var(--admin-muted)]"
                    title={reason}
                  >
                    —
                  </span>
                );
              },
            },
          ]}
        />
      </AdminSection>
      <MetricUnavailable
        label={isFa ? "تاریخچه اجرای cron" : "Cron execution history"}
        reason={
          isFa
            ? "جدول cron_runs وجود ندارد — نمی‌توان تاریخچه اجرای موفق را گزارش کرد"
            : "No cron_runs table — cannot report successful execution history"
        }
      />
    </div>
  );
}
