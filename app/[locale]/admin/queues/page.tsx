import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminQueueMetrics } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminCard,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { MetricCell } from "@/components/admin/phase4/MetricCell";
export default async function AdminQueuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "jobs.read");
  const isFa = locale === "fa";
  const queues = await getAdminQueueMetrics({ userId });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "صف‌ها" : "Queues"}
        description={
          isFa
            ? "فقط صف import_jobs — نه Redis/SQS یا صف‌های ساختگی"
            : "Only import_jobs queue — not Redis/SQS or invented queues"
        }
      />
      <AdminCard>
        <p className="text-xs text-[var(--admin-muted)]">
          {isFa
            ? "در این مخزن فقط import_jobs به‌عنوان صف durable worker وجود دارد."
            : "This repository only has import_jobs as a durable worker queue."}
        </p>
      </AdminCard>
      {queues.map((q) => (
        <AdminSection key={q.id} title={q.name}>
          <p className="mb-3 text-[11px] text-[var(--admin-muted)]">
            {q.source}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AdminMetricCard label={isFa ? "عمق صف" : "Queue depth"} metric={q.depth} />
            <AdminMetricCard
              label={isFa ? "قدیمی‌ترین (ms)" : "Oldest age (ms)"}
              metric={q.oldestAgeMs}
            />
            <AdminMetricCard
              label={isFa ? "توان ۲۴س" : "Throughput 24h"}
              metric={q.throughput24h}
            />
            <AdminMetricCard
              label={isFa ? "نرخ موفقیت" : "Success rate"}
              metric={q.successRate}
              style="percent"
            />
            <AdminMetricCard
              label={isFa ? "نرخ خطا" : "Failure rate"}
              metric={q.failureRate}
              style="percent"
            />
            <AdminMetricCard
              label={isFa ? "نرخ retry" : "Retry rate"}
              metric={q.retryRate}
              style="percent"
            />
          </div>
        </AdminSection>
      ))}
      <AdminSection title={isFa ? "صف‌های شناخته‌شده" : "Known queues"}>
        <AdminDataTable
          locale={locale}
          rows={queues}
          searchPlaceholder="queue…"
          emptyTitle={isFa ? "صفی نیست" : "No queues"}
          columns={[
            { id: "name", header: isFa ? "نام" : "Name", cell: (r) => r.name },
            {
              id: "depth",
              header: isFa ? "عمق" : "Depth",
              cell: (r) => <MetricCell metric={r.depth} />,
            },
            {
              id: "throughput",
              header: isFa ? "توان ۲۴س" : "24h throughput",
              cell: (r) => <MetricCell metric={r.throughput24h} />,
            },
            {
              id: "success",
              header: isFa ? "موفقیت" : "Success",
              cell: (r) => <MetricCell metric={r.successRate} style="percent" />,
            },
            {
              id: "source",
              header: "Source",
              cell: (r) => (
                <span className="text-xs text-[var(--admin-muted)]">
                  {r.source}
                </span>
              ),
            },
          ]}
        />
      </AdminSection>
    </div>
  );
}
