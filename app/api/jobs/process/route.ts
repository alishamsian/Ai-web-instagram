import { NextResponse } from "next/server";
import { assertJobWorkerAuthorized } from "@/lib/config/runtime";
import { parseLocale } from "@/lib/i18n/paths";
import { processImportJob } from "@/lib/jobs/import-job";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { writeStore } from "@/lib/database/store";
import { logInfo, logWarn } from "@/lib/observability/log";

/** Allow long Apify + media persistence on serverless. */
export const maxDuration = 300;

/**
 * Atomically claim the oldest queued job.
 * Prefer Postgres FOR UPDATE SKIP LOCKED via RPC; fall back to conditional update.
 */
async function claimNextQueuedJob(): Promise<string | null> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data: rpcId, error: rpcError } = await db.rpc(
      "claim_next_import_job",
    );
    if (!rpcError && rpcId) {
      logInfo("job.claim", { jobId: String(rpcId), via: "rpc" });
      return String(rpcId);
    }
    if (rpcError) {
      logWarn("job.claim_rpc_fallback", {
        message: rpcError.message?.slice(0, 120) ?? "rpc_failed",
      });
    }

    // Fallback when migration not yet applied: conditional update on one row.
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
  if (!jobId) {
    jobId = (await claimNextQueuedJob()) ?? undefined;
  }
  if (!jobId) {
    return NextResponse.json({ ok: true, processed: false });
  }

  logInfo("job.worker_start", {
    jobId,
    claimedFromQueue,
    locale,
  });
  await processImportJob(jobId, locale, body.postsLimit);
  return NextResponse.json({ ok: true, processed: true, jobId });
}

/**
 * Authenticated job worker. Called by scheduleImportProcessing / Vercel Cron / poll.
 */
export async function POST(request: Request) {
  return runWorker(request);
}

/** Vercel Cron hits GET by default. */
export async function GET(request: Request) {
  return runWorker(request);
}
