import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminCronRunSummaries } from "@/lib/admin/phase5-queries";
import {
  AdminPageHeader,
  AdminSection,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
import { relativeTime } from "@/components/admin/format";

export default async function AdminCronPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const isFa = locale === "fa";
  const { rows, historyUnavailableReason } = await getAdminCronRunSummaries({
    userId,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cron"
        description={
          isFa
            ? "زمان‌بندی پیکربندی‌شده ≠ اجرای موفق — تاریخچه فقط از cron_runs"
            : "Configured schedule ≠ successful execution — history only from cron_runs"
        }
      />
      <AdminSection title={isFa ? "زمان‌بندی‌ها و اجرا" : "Schedules & execution"}>
        <AdminDataTable
          locale={locale}
          rows={rows}
          searchPlaceholder="name…"
          emptyTitle={isFa ? "زمان‌بندی‌ای نیست" : "No schedules"}
          columns={[
            { id: "name", header: isFa ? "نام" : "Name", cell: (r) => r.jobName },
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
              id: "lastStatus",
              header: isFa ? "آخرین وضعیت" : "Last status",
              cell: (r) =>
                r.lastStatus.status === "available" ? (
                  <span className="text-xs">{r.lastStatus.value}</span>
                ) : (
                  <span
                    className="text-xs text-[var(--admin-muted)]"
                    title={
                      r.lastStatus.status === "unavailable" ||
                      r.lastStatus.status === "error" ||
                      r.lastStatus.status === "insufficient_sample"
                        ? r.lastStatus.reason
                        : undefined
                    }
                  >
                    —
                  </span>
                ),
            },
            {
              id: "lastStarted",
              header: isFa ? "آخرین شروع" : "Last started",
              cell: (r) =>
                r.lastStartedAt.status === "available" ? (
                  relativeTime(r.lastStartedAt.value, locale)
                ) : (
                  <span
                    className="text-xs text-[var(--admin-muted)]"
                    title={
                      r.lastStartedAt.status === "unavailable" ||
                      r.lastStartedAt.status === "error" ||
                      r.lastStartedAt.status === "insufficient_sample"
                        ? r.lastStartedAt.reason
                        : undefined
                    }
                  >
                    —
                  </span>
                ),
            },
            {
              id: "ok",
              header: isFa ? "موفق ۲۴س" : "Success 24h",
              cell: (r) => <MetricCell metric={r.success24h} />,
            },
            {
              id: "fail",
              header: isFa ? "ناموفق ۲۴س" : "Failed 24h",
              cell: (r) => <MetricCell metric={r.failed24h} />,
            },
          ]}
        />
      </AdminSection>
      {historyUnavailableReason ? (
        <MetricUnavailable
          label={isFa ? "تاریخچه اجرای cron" : "Cron execution history"}
          reason={historyUnavailableReason}
        />
      ) : null}
    </div>
  );
}
