"use client";

import { useMemo, useState, useTransition } from "react";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { relativeTime } from "@/components/admin/format";
import { retryAdminImportJob } from "@/lib/admin/phase3-actions";
import type { MetricResult } from "@/lib/admin/contracts";
import type { Locale } from "@/lib/config/env";

export type AdminJobRow = {
  id: string;
  status: string;
  stage: string;
  retry_count: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  username?: string | null;
  workspace_id?: string | null;
};

export function JobsCommandCenter({
  locale,
  rows,
  metrics,
  canRetry,
  initialFocus,
}: {
  locale: Locale;
  rows: AdminJobRow[];
  metrics: {
    queueDepth: MetricResult<number>;
    running: MetricResult<number>;
    failed: MetricResult<number>;
    successRate: MetricResult<number>;
  };
  canRetry: boolean;
  initialFocus?: string | null;
}) {
  const isFa = locale === "fa";
  const [focusId, setFocusId] = useState<string | null>(initialFocus ?? null);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const focused = useMemo(
    () => rows.find((r) => r.id === focusId) ?? null,
    [rows, focusId],
  );

  function doRetry() {
    if (!focused) return;
    startTransition(async () => {
      const result = await retryAdminImportJob({ jobId: focused.id });
      setConfirmRetry(false);
      setMessage(
        result.ok
          ? isFa
            ? "جاب به صف بازگشت"
            : "Job re-queued"
          : result.message,
      );
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "جاب‌ها / صف" : "Jobs / Queue"}
        description={
          isFa
            ? "مانیتورینگ صف import_jobs — بدون صف Redis/SQS ساختگی"
            : "Monitoring import_jobs queue — no invented Redis/SQS layer"
        }
      />

      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "عمق صف" : "Queue depth"}
            metric={metrics.queueDepth}
          />
          <AdminMetricCard
            label={isFa ? "در حال اجرا" : "Running"}
            metric={metrics.running}
          />
          <AdminMetricCard
            label={isFa ? "ناموفق" : "Failed"}
            metric={metrics.failed}
          />
          <AdminMetricCard
            label={isFa ? "نرخ موفقیت" : "Success rate"}
            metric={metrics.successRate}
            style="percent"
          />
        </div>
      </AdminSection>

      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={isFa ? "وضعیت…" : "status…"}
        emptyTitle={isFa ? "جابی نیست" : "No jobs"}
        onRowClick={(r) => setFocusId(r.id)}
        columns={[
          {
            id: "id",
            header: "ID",
            cell: (r) => (
              <span className="font-mono text-[11px]">{r.id.slice(0, 8)}…</span>
            ),
          },
          {
            id: "status",
            header: "Status",
            sortValue: (r) => r.status,
            cell: (r) => (
              <AdminStatusBadge
                tone={
                  r.status === "failed"
                    ? "danger"
                    : r.status === "completed"
                      ? "success"
                      : "neutral"
                }
              >
                {r.status}
              </AdminStatusBadge>
            ),
          },
          {
            id: "stage",
            header: "Stage",
            cell: (r) => r.stage || "—",
          },
          {
            id: "retry",
            header: "Attempts",
            sortValue: (r) => r.retry_count,
            cell: (r) => r.retry_count,
          },
          {
            id: "duration",
            header: "Duration",
            cell: (r) =>
              r.duration_ms == null
                ? "—"
                : `${Math.round(r.duration_ms / 1000)}s`,
          },
          {
            id: "created",
            header: isFa ? "ایجاد" : "Created",
            sortValue: (r) => r.created_at,
            cell: (r) => relativeTime(r.created_at, locale),
          },
        ]}
      />

      <AdminDrawer
        open={Boolean(focused)}
        onClose={() => setFocusId(null)}
        title={isFa ? "Job 360" : "Job 360"}
        subtitle={focused ? focused.id : undefined}
      >
        {focused ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-[var(--admin-muted)]">Status</dt>
                <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">
                  {focused.status}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Stage</dt>
                <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">
                  {focused.stage || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Attempts</dt>
                <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">
                  {focused.retry_count}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Created</dt>
                <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">
                  {relativeTime(focused.created_at, locale)}
                </dd>
              </div>
            </dl>
            {focused.error_message ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {focused.error_message}
              </p>
            ) : null}
            {canRetry && focused.status === "failed" ? (
              <button
                type="button"
                onClick={() => setConfirmRetry(true)}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs font-medium text-[var(--admin-fg)] hover:bg-[var(--admin-muted-bg)]"
              >
                {isFa ? "Retry (با تأیید)" : "Retry (with confirm)"}
              </button>
            ) : null}
            {message ? (
              <p className="text-xs text-[var(--admin-muted)]">{message}</p>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>

      <AdminConfirmDialog
        open={confirmRetry}
        title={isFa ? "تأیید Retry" : "Confirm retry"}
        description={
          isFa
            ? "فقط جاب‌های failed دوباره صف می‌شوند. عملیات audit می‌شود و نباید برای کارهای خطرناک کورکورانه اجرا شود."
            : "Only failed jobs are re-queued. The action is audited and must not blindly retry dangerous operations."
        }
        confirmLabel={isFa ? "Retry" : "Retry"}
        cancelLabel={isFa ? "لغو" : "Cancel"}
        busy={pending}
        onCancel={() => setConfirmRetry(false)}
        onConfirm={doRetry}
      />
    </div>
  );
}
