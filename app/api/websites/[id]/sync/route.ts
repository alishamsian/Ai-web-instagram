import { NextResponse } from "next/server";
import { createImportJob, PlanLimitError } from "@/lib/jobs/import-job";
import { scheduleImportProcessing } from "@/lib/jobs/queue";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { planLimits } from "@/lib/config/plans";
import { parseLocale } from "@/lib/i18n/paths";
import { requirePersistence } from "@/lib/config/runtime";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";

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

  let sourceUrl = body.url?.trim() || "";
  if (!sourceUrl && website.importId) {
    if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
      const db = getSupabaseAdmin();
      const { data } = await db
        .from("instagram_imports")
        .select("source_url, username")
        .eq("id", website.importId)
        .maybeSingle();
      if (data?.source_url) {
        sourceUrl = data.source_url as string;
      } else if (data?.username) {
        sourceUrl = `https://instagram.com/${data.username}`;
      }
    } else {
      const store = await readStore();
      const imported = store.imports.find((item) => item.id === website.importId);
      if (imported?.sourceUrl) sourceUrl = imported.sourceUrl;
      else if (imported?.username) {
        sourceUrl = `https://instagram.com/${imported.username}`;
      }
    }
  }
  if (!sourceUrl) {
    const contactIg = website.config.content.contact?.info?.instagram;
    if (contactIg) {
      sourceUrl = contactIg.startsWith("http")
        ? contactIg
        : `https://instagram.com/${contactIg.replace(/^@/, "")}`;
    }
  }
  if (!sourceUrl) {
    return NextResponse.json(
      {
        error: "NO_SOURCE",
        message: "No Instagram source linked to this website.",
      },
      { status: 400 },
    );
  }

  try {
    const job = await createImportJob({
      userId: session.user.id,
      workspaceId: session.workspace.id,
      sourceUrl,
      locale,
      forceRefresh: true,
      plan: session.workspace.plan,
      postsLimit: limits.maxImportPosts,
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
