import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getPublishedWebsiteBySlug, getWebsiteById } from "@/lib/database/queries";

/**
 * Public beacon — records a page view for published sites.
 * Body: { websiteId? , slug?, path?, referrer? }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    websiteId?: string;
    slug?: string;
    path?: string;
    referrer?: string;
  };

  let websiteId = body.websiteId;
  if (!websiteId && body.slug) {
    const site = await getPublishedWebsiteBySlug(body.slug);
    websiteId = site?.id;
  }
  if (!websiteId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const site = await getWebsiteById(websiteId);
  if (!site || site.status !== "published") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const db = getSupabaseAdmin();
  const ua = request.headers.get("user-agent")?.slice(0, 280) ?? null;
  await db.from("page_views").insert({
    website_id: websiteId,
    path: (body.path || "/").slice(0, 500),
    referrer: body.referrer?.slice(0, 500) ?? null,
    user_agent: ua,
  });

  return NextResponse.json({ ok: true, stored: true });
}
