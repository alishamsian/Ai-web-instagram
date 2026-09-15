import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIAnomalies } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminEmptyState,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { formatMetricNumber, relativeTime } from "@/components/admin/format";

function severityTone(
  severity: string,
): "info" | "warning" | "danger" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "neutral";
}

export default async function AdminAIAnomaliesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "ai.read");
  const isFa = locale === "fa";
  const anomalies = await getAdminAIAnomalies({ userId });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "ناهنجاری‌های AI" : "AI Anomalies"}
        description={
          isFa
            ? "۲۴ ساعت اخیر در برابر ۲۴ ساعت قبل — بدون آستانهٔ جعلی"
            : "Last 24h vs prior 24h — no invented thresholds"
        }
      />
      {!anomalies.length ? (
        <AdminEmptyState
          title={isFa ? "ناهنجاری شناسایی نشد" : "No anomalies detected"}
          body={
            isFa
              ? "در پنجرهٔ مقایسهٔ اخیر سیگنال قابل‌توجهی نیست."
              : "No notable signals in the recent comparison window."
          }
        />
      ) : (
        <AdminSection>
          <AdminDataTable
            locale={locale}
            rows={anomalies}
            searchPlaceholder={isFa ? "عنوان…" : "title…"}
            emptyTitle=""
            columns={[
              {
                id: "title",
                header: isFa ? "عنوان" : "Title",
                cell: (r) => r.title,
              },
              {
                id: "severity",
                header: isFa ? "شدت" : "Severity",
                cell: (r) => (
                  <AdminStatusBadge tone={severityTone(r.severity)}>
                    {r.severity}
                  </AdminStatusBadge>
                ),
                sortValue: (r) => r.severity,
              },
              {
                id: "whatChanged",
                header: isFa ? "تغییر" : "What changed",
                cell: (r) => (
                  <span className="text-xs text-[var(--admin-muted)]">
                    {r.whatChanged}
                  </span>
                ),
              },
              {
                id: "observed",
                header: isFa ? "مشاهده‌شده" : "Observed",
                sortValue: (r) => r.observed,
                cell: (r) => formatMetricNumber(r.observed),
              },
              {
                id: "baseline",
                header: isFa ? "خط پایه" : "Baseline",
                sortValue: (r) => r.baseline,
                cell: (r) => formatMetricNumber(r.baseline),
              },
              {
                id: "delta",
                header: "Delta",
                sortValue: (r) => r.delta,
                cell: (r) => formatMetricNumber(r.delta),
              },
              {
                id: "window",
                header: isFa ? "پنجره" : "Window",
                cell: (r) => r.window,
              },
              {
                id: "detectedAt",
                header: isFa ? "شناسایی" : "Detected",
                sortValue: (r) => r.detectedAt,
                cell: (r) => relativeTime(r.detectedAt, locale),
              },
            ]}
          />
        </AdminSection>
      )}
    </div>
  );
}
