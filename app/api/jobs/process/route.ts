import { NextResponse } from "next/server";
import { assertJobWorkerAuthorized } from "@/lib/config/runtime";
import { parseLocale } from "@/lib/i18n/paths";
import { processImportJob } from "@/lib/jobs/import-job";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { writeStore } from "@/lib/database/store";
import { logInfo, logWarn } from "@/lib/observability/log";

export const maxDuration = 300;

async function claimNextQueuedJob(): Promise<string | null> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
    const workerId = `vercel:${process.env.VERCEL_REGION ?? "unknown"}:${crypto.randomUUID()}`;
    const { data, error: rpcError } = await db.rpc("claim_next_import_job", {
      p_worker_id: workerId,
      p_stale_before: staleBefore,
      p_max_retries: 3,
    });
    const rpcId = Array.isArray(data) ? data[0]?.id : data?.id;
    if (!rpcError && rpcId) {
      logInfo("job.claim", { jobId: String(rpcId), via: "rpc" });
      return String(rpcId);
    }
    if (rpcError) {
      logWarn("job.claim_rpc_fallback", {
        message: rpcError.message?.slice(0, 120) ?? "rpc_failed",
      });
    }

    // Safe compatibility fallback while the newest DB migration propagates.
    const { data: queued } = await db
      .from("import_jobs")
      .select("id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!queued?.id) return null;
    const { data: claimed } = await db
      .from("import_jobs")
      .update({
        status: "scraping",
        stage: "connecting",
        updated_at: new Date().toISOString(),
      })
      .eq("id", queued.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (claimed?.id) {
      logInfo("job.claim", { jobId: claimed.id, via: "update" });
      return claimed.id;
    }
    return null;
  }

  let claimedId: string | null = null;
  await writeStore((store) => {
    const job = store.jobs.find((item) => item.status === "queued");
    if (!job) return;
    job.status = "scraping";
    job.stage = "connecting";
    job.updatedAt = new Date().toISOString();
    claimedId = job.id;
  });
  if (claimedId) logInfo("job.claim", { jobId: claimedId, via: "memory" });
  return claimedId;
}

async function runWorker(request: Request) {
  if (!assertJobWorkerAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: { jobId?: string; locale?: string; postsLimit?: number } = {};
  if (request.method === "POST") {
    body = (await request.json().catch(() => ({}))) as typeof body;
  } else {
    const url = new URL(request.url);
    body = {
      jobId: url.searchParams.get("jobId") ?? undefined,
      locale: url.searchParams.get("locale") ?? undefined,
    };
  }
  const locale = parseLocale(body.locale);
  let jobId = body.jobId;
  const claimedFromQueue = !jobId;
  if (!jobId) jobId = (await claimNextQueuedJob()) ?? undefined;
  if (!jobId) return NextResponse.json({ ok: true, processed: false });
  logInfo("job.worker_start", { jobId, claimedFromQueue, locale });
  await processImportJob(jobId, locale, body.postsLimit);
  return NextResponse.json({ ok: true, processed: true, jobId });
}

export async function POST(request: Request) {
  return runWorker(request);
}

export async function GET(request: Request) {
  return runWorker(request);
}
