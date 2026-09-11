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
export function scheduleImportProcessing(jobId: string, locale: Locale) {
  after(() => {
    void triggerImportWorker(jobId, locale).catch((error) => {
      console.error("[import] worker trigger failed", jobId, error);
      // Fallback: run in-process if HTTP trigger fails (local/dev).
      void processImportJob(jobId, locale).catch((err) => {
        console.error("[import] in-process fallback failed", jobId, err);
      });
    });
  });
}

export async function triggerImportWorker(jobId: string, locale: Locale) {
  const secret = getJobWorkerSecret();
  const base = APP_URL.replace(/\/$/, "");
  const url = `${base}/api/jobs/process`;

  if (!secret) {
    await processImportJob(jobId, locale);
    return { ok: true, mode: "inline" as const };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ jobId, locale }),
    // Don't hang forever if worker is cold.
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Inline fallback when the HTTP worker is unreachable.
    await processImportJob(jobId, locale);
    return { ok: true, mode: "inline-fallback" as const };
  }

  return { ok: true, mode: "http" as const };
}
