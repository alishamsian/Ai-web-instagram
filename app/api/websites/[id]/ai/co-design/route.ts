import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { proposeCoDesign } from "@/lib/editor/ai/co-design";
import {
  mergeTrustedDraftHints,
  type AiDraftHints,
} from "@/lib/editor/ai/draft";
import type { ViewportBucket } from "@/lib/editor/responsive";

const MAX_PROMPT = 2000;

/**
 * POST /api/websites/[id]/ai/co-design
 * Server-authoritative: loads WebsiteConfig from DB.
 * Optional bounded draftHints overlay unsaved content/brand only.
 * Does not mutate the website; client applies after confirmation.
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
    expectedVersion?: number;
    draftHints?: AiDraftHints;
    /** Ignored — full client config is never trusted. */
    config?: unknown;
  };

  // Explicitly ignore body.config (security)
  void body.config;

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
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

  const merged = mergeTrustedDraftHints(website.config, body.draftHints);
  if (!merged.ok) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        messageFa: "پیش‌نویس ویرایش قابل‌اعتماد نیست.",
        messageEn: "Draft hints could not be validated.",
      },
      { status: 400 },
    );
  }

  // selectedSectionId must exist on the working config (server + draft)
  let selectedSectionId = body.selectedSectionId ?? null;
  if (
    selectedSectionId &&
    !merged.config.sections.some((s) => s.id === selectedSectionId)
  ) {
    selectedSectionId = null;
  }

  const result = await proposeCoDesign({
    config: merged.config,
    prompt,
    locale,
    selectedSectionId,
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
    const errorCode =
      result.code === "unsafe"
        ? "AI_ACTION_REJECTED"
        : result.code === "ai_failed"
          ? "AI_INVALID_RESPONSE"
          : result.code === "ai_unavailable"
            ? "AI_UNAVAILABLE"
            : result.code === "clarify"
              ? "INVALID_REQUEST"
              : result.code.toUpperCase();
    return NextResponse.json(
      {
        error: errorCode,
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
    baseVersion: website.version,
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
