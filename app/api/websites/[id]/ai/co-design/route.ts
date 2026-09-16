import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { proposeCoDesign } from "@/lib/editor/ai/co-design";
import type { ViewportBucket } from "@/lib/editor/responsive";

/**
 * POST /api/websites/[id]/ai/co-design
 * Server-side only — returns validated EditorAction proposals.
 * Does not mutate the website; client applies after user confirmation.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const website = await getWebsiteForWorkspace(id, session.workspace.id);
  if (!website) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    selectedSectionId?: string | null;
    viewport?: ViewportBucket;
    locale?: "fa" | "en";
    /** Client may send live config so proposals match unsaved edits. */
    config?: typeof website.config;
    expectedVersion?: number;
  };

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 2000) {
    return NextResponse.json(
      {
        error: "INVALID_PROMPT",
        messageFa: "دستور نامعتبر است.",
        messageEn: "Invalid prompt.",
      },
      { status: 400 },
    );
  }

  if (
    typeof body.expectedVersion === "number" &&
    body.expectedVersion !== website.version
  ) {
    return NextResponse.json(
      {
        error: "VERSION_CONFLICT",
        messageFa:
          "نسخه سایت تغییر کرده. صفحه را به‌روزرسانی کنید و دوباره تلاش کنید.",
        messageEn:
          "The website changed while you were editing. Refresh and try again.",
      },
      { status: 409 },
    );
  }

  const locale =
    body.locale === "en" || body.locale === "fa"
      ? body.locale
      : website.config.settings.language;

  const config = body.config ?? website.config;

  const result = await proposeCoDesign({
    config,
    prompt,
    locale,
    selectedSectionId: body.selectedSectionId ?? null,
    viewport: body.viewport ?? "desktop",
    workspaceId: session.workspace.id,
    userId: session.user.id,
  });

  if (!result.ok) {
    const status =
      result.code === "clarify"
        ? 422
        : result.code === "ai_unavailable"
          ? 503
          : result.code === "unsafe" || result.code === "invalid"
            ? 422
            : 502;
    return NextResponse.json(
      {
        error: result.code.toUpperCase(),
        messageFa: result.messageFa,
        messageEn: result.messageEn,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    summary: result.summary,
    actions: result.actions,
    summaries: result.summaries,
    // Client applies via executeAiActionBatch against live config;
    // proposedConfig is for preview diff only (no secrets).
    proposed: {
      brand: result.proposedConfig.brand,
      content: {
        hero: result.proposedConfig.content.hero,
      },
      sections: result.proposedConfig.sections.map((s) => ({
        id: s.id,
        type: s.type,
        visible: s.visible,
        variant: s.variant,
      })),
    },
  });
}
