import { NextResponse } from "next/server";
import { createImportJob, PlanLimitError } from "@/lib/jobs/import-job";
import { scheduleImportProcessing } from "@/lib/jobs/queue";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { planLimits } from "@/lib/config/plans";
import { parseLocale } from "@/lib/i18n/paths";
import { requirePersistence } from "@/lib/config/runtime";

/**
 * Re-import Instagram content for an existing website (smart sync).
 * Free plan: blocked. Pro: allowed with forceRefresh.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requirePersistence();
  } catch {
    return NextResponse.json({ error: "SUPABASE_REQUIRED" }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const limits = planLimits(session.workspace.plan);
  if (!limits.smartSync) {
    return NextResponse.json(
      {
        error: "PRO_REQUIRED",
        message: "Smart Instagram sync is available on Pro.",
      },
      { status: 402 },
    );
  }

  const { id } = await params;
  const website = await getWebsiteForWorkspace(id, session.workspace.id);
  if (!website) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    locale?: string;
    url?: string;
  };
  const locale = parseLocale(body.locale);
  const sourceUrl =
    body.url ||
    `https://instagram.com/${website.slug.replace(/[^a-z0-9._]/gi, "")}`;

  try {
    const job = await createImportJob({
      userId: session.user.id,
      workspaceId: session.workspace.id,
      sourceUrl,
      locale,
      forceRefresh: true,
      plan: session.workspace.plan,
    });
    if (job.status !== "completed") {
      scheduleImportProcessing(job.id, locale);
    }
    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: "SYNC_FAILED" }, { status: 500 });
  }
}
