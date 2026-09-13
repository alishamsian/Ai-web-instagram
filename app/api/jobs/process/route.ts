import { NextResponse } from "next/server";
import { assertJobWorkerAuthorized } from "@/lib/config/runtime";
import { parseLocale } from "@/lib/i18n/paths";
import { processImportJob } from "@/lib/jobs/import-job";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";

/** Allow long Apify + media persistence on serverless. */
export const maxDuration = 300;

async function claimNextQueuedJob(): Promise<string | null> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data } = await db
      .from("import_jobs")
      .select("id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }

  const store = await readStore();
  const job = store.jobs.find((item) => item.status === "queued");
  return job?.id ?? null;
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
  if (!jobId) {
    jobId = (await claimNextQueuedJob()) ?? undefined;
  }
  if (!jobId) {
    return NextResponse.json({ ok: true, processed: false });
  }

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
