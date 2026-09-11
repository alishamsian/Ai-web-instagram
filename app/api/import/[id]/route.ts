import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";
import { failStaleImportJob } from "@/lib/jobs/import-job";
import { triggerImportWorker } from "@/lib/jobs/queue";
import { parseLocale } from "@/lib/i18n/paths";
import type { ImportJob } from "@/types/jobs";

function mapJobRow(row: Record<string, unknown>): ImportJob {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    userId: row.user_id as string,
    sourceUrl: row.source_url as string,
    username: (row.username as string | null) ?? null,
    status: row.status as ImportJob["status"],
    stage: row.stage as ImportJob["stage"],
    collector: row.collector as string,
    scrapeStatus: (row.scrape_status as ImportJob["scrapeStatus"]) ?? undefined,
    importId: (row.import_id as string | null) ?? undefined,
    websiteId: (row.website_id as string | null) ?? undefined,
    errorCode: (row.error_code as string | null) ?? undefined,
    errorMessage: (row.error_message as string | null) ?? undefined,
    retryCount: Number(row.retry_count ?? 0),
    postsImported: Number(row.posts_imported ?? 0),
    startedAt: (row.started_at as string) ?? (row.created_at as string),
    completedAt: (row.completed_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  let job: ImportJob | undefined;

  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("import_jobs")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", session.workspace.id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "SCRAPE_FAILED" }, { status: 500 });
    }
    if (data) job = mapJobRow(data as Record<string, unknown>);
  } else {
    const store = await readStore();
    job = store.jobs.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
  }

  if (!job) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // If still queued after a few seconds, re-kick the durable worker.
  if (job.status === "queued") {
    const age = Date.now() - Date.parse(job.createdAt);
    if (Number.isFinite(age) && age > 3_000) {
      const locale = parseLocale(
        new URL(request.url).searchParams.get("locale") ?? undefined,
      );
      void triggerImportWorker(job.id, locale).catch(() => undefined);
    }
  }

  job = await failStaleImportJob(job);
  return NextResponse.json(job);
}
