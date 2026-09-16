import { requireAdminPage } from "@/lib/admin/gate";
import {
  getBillingOperations,
  getBillingWebhookHealth,
  getBillingDataQualityReport,
} from "@/lib/admin/phase7-queries";
import {
  AdminPageHeader,
  AdminSection,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";

export default async function AdminBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "billing.read");
  const search = sp.workspace?.trim() || undefined;
  const [ops, health, dq] = await Promise.all([
    getBillingOperations({ userId, search }),
    getBillingWebhookHealth({ userId }),
    getBillingDataQualityReport({ userId }),
  ]);
  const isFa = locale === "fa";

  const subs = ops.subscriptions.rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    plan: r.plan,
    status: r.status,
    interval: r.billingInterval ?? "—",
    amount:
      r.unitAmountCents == null
        ? "—"
        : `${(r.unitAmountCents / 100).toFixed(2)} ${r.currency ?? ""}`.trim(),
    periodEnd: r.currentPeriodEnd
      ? new Date(r.currentPeriodEnd).toISOString().slice(0, 10)
      : "—",
    cancelAtPeriodEnd: r.cancelAtPeriodEnd ? "yes" : "no",
  }));

  const failed = ops.failedPayments.rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId ?? "—",
    type: r.transactionType,
    amount: `${(r.amountCents / 100).toFixed(2)} ${r.currency}`,
    occurredAt: new Date(r.occurredAt).toISOString().slice(0, 19),
    providerTx: r.providerTransactionId.slice(0, 18),
  }));

  const events = ops.events.rows.map((r) => ({
    id: r.id,
    type: r.eventType,
    status: r.status,
    workspaceId: r.workspaceId ?? "—",
    error: r.errorCode ?? "—",
    createdAt: new Date(r.createdAt).toISOString().slice(0, 19),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "صورتحساب" : "Billing"}
        description={
          isFa
            ? "اشتراک‌ها، وب‌هوک و پرداخت‌های ناموفق — بدون داده کارت"
            : "Subscriptions, webhooks, and failed payments — no card data"
        }
      />

      <AdminSection
        title={isFa ? "سلامت وب‌هوک (۷ روز)" : "Webhook health (7d)"}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard
            label={isFa ? "پردازش‌شده" : "Processed"}
            metric={health.processed}
          />
          <AdminMetricCard
            label={isFa ? "ناموفق" : "Failed"}
            metric={health.failed}
          />
          <AdminMetricCard
            label={isFa ? "در صف" : "Unprocessed"}
            metric={health.unprocessed}
          />
        </div>
      </AdminSection>

      <AdminSection title={isFa ? "اشتراک‌های اخیر" : "Recent subscriptions"}>
        {ops.subscriptions.unavailableReason ? (
          <MetricUnavailable
            label="Subscriptions"
            reason={ops.subscriptions.unavailableReason}
          />
        ) : (
          <AdminDataTable
            locale={locale}
            rows={subs}
            searchPlaceholder={
              isFa ? "جستجو workspace…" : "Search workspace…"
            }
            emptyTitle={isFa ? "اشتراکی نیست" : "No subscriptions"}
            columns={[
              {
                id: "workspaceId",
                header: "Workspace",
                sortValue: (r) => r.workspaceId,
                cell: (r) => (
                  <span className="font-mono text-[11px]">{r.workspaceId.slice(0, 8)}…</span>
                ),
              },
              { id: "plan", header: "Plan", sortValue: (r) => r.plan, cell: (r) => r.plan },
              {
                id: "status",
                header: "Status",
                sortValue: (r) => r.status,
                cell: (r) => r.status,
              },
              {
                id: "interval",
                header: isFa ? "دوره" : "Interval",
                cell: (r) => r.interval,
              },
              {
                id: "amount",
                header: isFa ? "مبلغ" : "Amount",
                cell: (r) => r.amount,
              },
              {
                id: "periodEnd",
                header: isFa ? "پایان دوره" : "Period end",
                cell: (r) => r.periodEnd,
              },
              {
                id: "cancel",
                header: "Cancel EoP",
                cell: (r) => r.cancelAtPeriodEnd,
              },
            ]}
          />
        )}
      </AdminSection>

      <AdminSection title={isFa ? "پرداخت‌های ناموفق" : "Failed payments"}>
        {ops.failedPayments.unavailableReason ? (
          <MetricUnavailable
            label="Failed payments"
            reason={ops.failedPayments.unavailableReason}
          />
        ) : (
          <AdminDataTable
            locale={locale}
            rows={failed}
            searchPlaceholder={isFa ? "جستجو…" : "Search…"}
            emptyTitle={isFa ? "پرداخت ناموفقی نیست" : "No failed payments"}
            columns={[
              {
                id: "workspaceId",
                header: "Workspace",
                cell: (r) => (
                  <span className="font-mono text-[11px]">{r.workspaceId}</span>
                ),
              },
              { id: "type", header: "Type", cell: (r) => r.type },
              { id: "amount", header: isFa ? "مبلغ" : "Amount", cell: (r) => r.amount },
              {
                id: "occurredAt",
                header: isFa ? "زمان" : "Occurred",
                sortValue: (r) => r.occurredAt,
                cell: (r) => r.occurredAt,
              },
              {
                id: "providerTx",
                header: "Provider tx",
                cell: (r) => (
                  <span className="font-mono text-[11px]">{r.providerTx}…</span>
                ),
              },
            ]}
          />
        )}
      </AdminSection>

      <AdminSection title={isFa ? "رویدادهای صورتحساب" : "Billing events"}>
        {ops.events.unavailableReason ? (
          <MetricUnavailable
            label="Billing events"
            reason={ops.events.unavailableReason}
          />
        ) : (
          <AdminDataTable
            locale={locale}
            rows={events}
            searchPlaceholder={isFa ? "جستجو…" : "Search…"}
            emptyTitle={isFa ? "رویدادی نیست" : "No events"}
            columns={[
              {
                id: "type",
                header: isFa ? "نوع" : "Type",
                sortValue: (r) => r.type,
                cell: (r) => r.type,
              },
              {
                id: "status",
                header: "Status",
                sortValue: (r) => r.status,
                cell: (r) => r.status,
              },
              {
                id: "workspaceId",
                header: "Workspace",
                cell: (r) => (
                  <span className="font-mono text-[11px]">{r.workspaceId}</span>
                ),
              },
              { id: "error", header: "Error", cell: (r) => r.error },
              {
                id: "createdAt",
                header: isFa ? "زمان" : "Created",
                sortValue: (r) => r.createdAt,
                cell: (r) => r.createdAt,
              },
            ]}
          />
        )}
      </AdminSection>

      <AdminSection title={isFa ? "کیفیت داده" : "Data quality"}>
        {dq.unavailableReason ? (
          <MetricUnavailable label="DQ" reason={dq.unavailableReason} />
        ) : dq.issues.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">
            {isFa ? "مشکل کیفیت داده‌ای یافت نشد." : "No data-quality issues found."}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {dq.issues.map((issue) => (
              <li
                key={issue.code}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2"
              >
                <span className="font-medium">{issue.code}</span>
                <span className="mx-2 text-[var(--admin-muted)]">
                  · {issue.severity} · n={issue.count}
                </span>
                <span className="text-[var(--admin-muted)]">{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
