import { NextResponse } from "next/server";
import { createImportJob, PlanLimitError } from "@/lib/jobs/import-job";
import { scheduleImportProcessing } from "@/lib/jobs/queue";
import { createDemoSession, getSession } from "@/lib/auth/session";
import { InstagramUrlError, isDemoUsername, normalizeInstagramUrl } from "@/lib/instagram/url";
import { parseLocale } from "@/lib/i18n/paths";
import { requirePersistence } from "@/lib/config/runtime";
import { publicError } from "@/lib/jobs/errors";

export async function POST(request: Request) {
  try {
    requirePersistence();
  } catch {
    return NextResponse.json({ error: "SUPABASE_REQUIRED" }, { status: 503 });
  }

  const body = (await request.json()) as {
    url?: string;
    locale?: string;
    forceRefresh?: boolean;
    postsLimit?: number | string;
  };
  const locale = parseLocale(body.locale);

  try {
    const parsed = normalizeInstagramUrl(body.url ?? "");
    let session = await getSession();

    if (!session && isDemoUsername(parsed.username)) {
      session = await createDemoSession();
    }

    if (!session) {
      return NextResponse.json(
        { error: "AUTH_REQUIRED", username: parsed.username },
        { status: 401 },
      );
    }

    const job = await createImportJob({
      userId: session.user.id,
      workspaceId: session.workspace.id,
      sourceUrl: parsed.profileUrl,
      locale,
      forceRefresh: Boolean(body.forceRefresh),
      plan: session.workspace.plan,
      postsLimit: body.postsLimit,
    });

    if (job.status !== "completed") {
      scheduleImportProcessing(job.id, locale, job.postsLimit);
    }

    return NextResponse.json({
      ...job,
      cached: job.collector === "cache",
    });
  } catch (error) {
    if (error instanceof InstagramUrlError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 400 },
      );
    }
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 402 },
      );
    }
    console.error("[api/import] failed", error);
    const safe = publicError("UNKNOWN");
    return NextResponse.json(
      {
        error: safe.code,
        message: safe.message,
      },
      { status: 500 },
    );
  }
}
