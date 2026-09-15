import type { SystemHealthMetrics } from "@/lib/admin/contracts";
import { AdminCard, AdminStatusBadge } from "@/components/admin/primitives";
import type { Locale } from "@/lib/config/env";

function HealthTile({
  label,
  status,
  detail,
}: {
  label: string;
  status: "ok" | "warn" | "unknown";
  detail: string;
}) {
  return (
    <AdminCard className="!p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--admin-fg)]">{label}</p>
        <AdminStatusBadge
          tone={
            status === "ok" ? "success" : status === "warn" ? "warning" : "neutral"
          }
        >
          {status === "ok" ? "ok" : status === "warn" ? "attention" : "n/a"}
        </AdminStatusBadge>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--admin-muted)]">
        {detail}
      </p>
    </AdminCard>
  );
}

export function AdminSystemHealthGrid({
  health,
  locale,
}: {
  health: SystemHealthMetrics;
  locale: Locale;
}) {
  const isFa = locale === "fa";
  const open =
    health.openAlerts.status === "available" ? health.openAlerts.value : null;
  const critical =
    health.criticalAlerts.status === "available"
      ? health.criticalAlerts.value
      : null;
  const failed =
    health.failedJobs24h.status === "available"
      ? health.failedJobs24h.value
      : null;
  const queue =
    health.queueDepth.status === "available" ? health.queueDepth.value : null;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <HealthTile
        label={isFa ? "هشدارها" : "Alerts"}
        status={
          critical == null ? "unknown" : critical > 0 ? "warn" : "ok"
        }
        detail={
          open == null
            ? health.openAlerts.status === "unavailable"
              ? health.openAlerts.reason
              : "—"
            : `${open} open · ${critical ?? "—"} critical`
        }
      />
      <HealthTile
        label={isFa ? "جاب‌ها" : "Jobs"}
        status={failed == null ? "unknown" : failed > 0 ? "warn" : "ok"}
        detail={
          failed == null
            ? health.failedJobs24h.status === "unavailable"
              ? health.failedJobs24h.reason
              : "—"
            : `${failed} failed (24h) · queue ${queue ?? "—"}`
        }
      />
      <HealthTile
        label={isFa ? "دیتابیس" : "Database"}
        status="unknown"
        detail={
          isFa
            ? "uptime ساختگی نمایش داده نمی‌شود"
            : "No synthetic uptime — probe via ops tooling"
        }
      />
      <HealthTile
        label={isFa ? "AI / Storage / Domains" : "AI / Storage / Domains"}
        status="unknown"
        detail={
          isFa
            ? "وضعیت زنده نیازمند health endpoint اختصاصی است"
            : "Live probes require dedicated health endpoints"
        }
      />
    </div>
  );
}
