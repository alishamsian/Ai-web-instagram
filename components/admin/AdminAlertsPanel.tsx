"use client";

import { useTransition } from "react";
import type { AlertSummary } from "@/lib/admin/contracts";
import {
  AdminEmptyState,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { relativeTime } from "@/components/admin/format";
import {
  acknowledgeAdminAlert,
  resolveAdminAlert,
} from "@/lib/admin/actions";
import type { Locale } from "@/lib/config/env";

export function AdminAlertsPanel({
  alerts,
  locale,
  canManage,
}: {
  alerts: AlertSummary[];
  locale: Locale;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const isFa = locale === "fa";

  if (!alerts.length) {
    return (
      <AdminEmptyState
        title={isFa ? "هشداری نیست" : "No alerts"}
        body={
          isFa
            ? "وقتی آستانه‌ها رد شوند، هشدارها اینجا نمایش داده می‌شوند."
            : "Alerts appear here when thresholds are breached."
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <AdminStatusBadge
                  tone={
                    alert.severity === "critical"
                      ? "danger"
                      : alert.severity === "warning"
                        ? "warning"
                        : "info"
                  }
                >
                  {alert.severity}
                </AdminStatusBadge>
                <span className="text-sm font-medium text-[var(--admin-fg)]">
                  {alert.metric}
                </span>
                <AdminStatusBadge tone="neutral">{alert.status}</AdminStatusBadge>
              </div>
              {alert.message ? (
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {alert.message}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                {alert.value != null ? `value ${alert.value}` : null}
                {alert.threshold != null ? ` · threshold ${alert.threshold}` : null}
                {" · "}
                {relativeTime(alert.createdAt, locale)}
              </p>
            </div>
            {canManage && alert.status === "open" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1 text-[11px] disabled:opacity-50"
                  onClick={() =>
                    startTransition(async () => {
                      await acknowledgeAdminAlert(alert.id);
                    })
                  }
                >
                  {isFa ? "تأیید" : "Acknowledge"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg bg-[var(--admin-fg)] px-2.5 py-1 text-[11px] text-[var(--admin-bg)] disabled:opacity-50"
                  onClick={() =>
                    startTransition(async () => {
                      await resolveAdminAlert(alert.id);
                    })
                  }
                >
                  {isFa ? "حل شد" : "Resolve"}
                </button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
