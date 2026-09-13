import { APP_URL } from "@/lib/config/env";
import { getJobWorkerSecret } from "@/lib/config/runtime";
import { processImportJob } from "@/lib/jobs/import-job";
import type { Locale } from "@/lib/config/env";
import { after } from "next/server";

/**
 * Durable import scheduling: persist the job first, then hit an authenticated
 * worker endpoint so work continues even if the original request ends.
 * Polling also re-triggers the worker if the job is still queued.
 */
export function scheduleImportProcessing(
  jobId: string,
  locale: Locale,
  postsLimit?: number,
) {
  after(() => {
    void triggerImportWorker(jobId, locale, postsLimit).catch((error) => {
      console.error("[import] worker trigger failed", jobId, error);
      // Only fall back when the HTTP worker never started (network/config),
      // not when the wait timed out while the worker is still running.
      const timedOut =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      if (timedOut) return;
      void processImportJob(jobId, locale, postsLimit).catch((err) => {
        console.error("[import] in-process fallback failed", jobId, err);
      });
    });
  });
}

export async function triggerImportWorker(
  jobId: string,
  locale: Locale,
  postsLimit?: number,
) {
  const secret = getJobWorkerSecret();
  const base = APP_URL.replace(/\/$/, "");
  const url = `${base}/api/jobs/process`;

  if (!secret) {
    await processImportJob(jobId, locale, postsLimit);
    return { ok: true, mode: "inline" as const };
  }

  // Long enough that we usually see acceptance; worker itself can run up to maxDuration.
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ jobId, locale, postsLimit }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    await processImportJob(jobId, locale, postsLimit);
    return { ok: true, mode: "inline-fallback" as const };
  }

  return { ok: true, mode: "http" as const };
}
