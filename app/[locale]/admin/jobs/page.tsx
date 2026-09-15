import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminJobs, getAdminSystemHealth } from "@/lib/admin/queries";
import { JobsCommandCenter } from "@/components/admin/phase3/JobsCommandCenter";
import { roleHasPermission } from "@/lib/admin/permissions";
import { normalizeJobStatus } from "@/lib/admin/jobs";
import type { MetricResult } from "@/lib/admin/contracts";

function available(value: number, source: string): MetricResult<number> {
  return { status: "available", value, source };
}

function partial(
  value: number,
  source: string,
  warning: string,
): MetricResult<number> {
  return { status: "partial", value, source, warning };
}

export default async function AdminJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { actor, locale, userId } = await requireAdminPage(raw, "jobs.read");
  const [jobs, health] = await Promise.all([
    getAdminJobs({ userId, limit: 100 }),
    getAdminSystemHealth({ userId }),
  ]);

  const rows = jobs.map((j) => ({
    id: j.id as string,
    status: (j.status as string) ?? "",
    stage: (j.stage as string) ?? "",
    retry_count: Number(j.retry_count ?? 0),
    duration_ms: j.duration_ms == null ? null : Number(j.duration_ms),
    error_message: (j.error_message as string | null) ?? null,
    created_at: j.created_at as string,
    workspace_id: (j.workspace_id as string | null) ?? null,
  }));

  const normalized = rows.map((r) => ({
    ...r,
    norm: normalizeJobStatus(r.status),
  }));
  const queued = normalized.filter((r) => r.norm === "queued").length;
  const running = normalized.filter((r) => r.norm === "running").length;
  const failed = normalized.filter((r) => r.norm === "failed").length;
  const completed = normalized.filter((r) => r.norm === "completed").length;
  const finished = completed + failed;
  const successRate: MetricResult<number> =
    finished === 0
      ? {
          status: "unavailable",
          reason: "No finished jobs in current sample (last 100)",
          source: "import_jobs",
        }
      : partial(
          completed / finished,
          "import_jobs",
          "Success rate from latest 100 jobs sample only",
        );

  return (
    <JobsCommandCenter
      locale={locale}
      rows={rows}
      initialFocus={sp.focus ?? null}
      canRetry={roleHasPermission(actor.role, "jobs.retry")}
      metrics={{
        queueDepth:
          health.queueDepth.status === "available"
            ? health.queueDepth
            : available(queued, "import_jobs.status"),
        running: available(running, "import_jobs.status"),
        failed:
          health.failedJobs24h.status === "available"
            ? health.failedJobs24h
            : available(failed, "import_jobs.status"),
        successRate,
      }}
    />
  );
}
