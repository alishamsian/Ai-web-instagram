import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAuditLogs } from "@/lib/admin/phase5-queries";
import {
  AdminPageHeader,
  AdminEmptyState,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; action?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "audit.read");
  const isFa = locale === "fa";
  const { rows, unavailableReason } = await getAdminAuditLogs({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    action: sp.action || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "ممیزی" : "Audit"}
        description={
          isFa
            ? "append-only — فقط admin_audit_logs با pagination محدود"
            : "Append-only — admin_audit_logs with bounded pagination"
        }
      />
      {unavailableReason ? (
        <MetricUnavailable
          label={isFa ? "ممیزی" : "Audit"}
          reason={unavailableReason}
          compact
        />
      ) : !rows.length ? (
        <AdminEmptyState
          title={isFa ? "رویدادی نیست" : "No audit events"}
          body={
            isFa
              ? "در این بازه رویدادی ثبت نشده است."
              : "No audit events in this range."
          }
        />
      ) : (
        <AdminDataTable
          locale={locale}
          rows={rows}
          searchPlaceholder="action / resource…"
          emptyTitle=""
          columns={[
            {
              id: "action",
              header: isFa ? "اقدام" : "Action",
              cell: (r) => (
                <span className="font-mono text-xs">{r.action}</span>
              ),
            },
            {
              id: "actor",
              header: isFa ? "عامل" : "Actor",
              cell: (r) => r.actorRole ?? r.actorUserId?.slice(0, 8) ?? "—",
            },
            {
              id: "resource",
              header: isFa ? "منبع" : "Resource",
              cell: (r) =>
                r.resourceType
                  ? `${r.resourceType}${r.resourceId ? `:${r.resourceId.slice(0, 8)}` : ""}`
                  : "—",
            },
            {
              id: "reason",
              header: isFa ? "دلیل" : "Reason",
              cell: (r) => r.reason ?? "—",
            },
            {
              id: "when",
              header: isFa ? "زمان" : "When",
              sortValue: (r) => r.createdAt,
              cell: (r) => relativeTime(r.createdAt, locale),
            },
          ]}
        />
      )}
    </div>
  );
}
