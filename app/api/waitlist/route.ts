import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    locale?: string;
    source?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = checkRateLimit(`waitlist:${ip}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("waitlist").upsert(
    {
      email,
      locale: body.locale === "en" ? "en" : "fa",
      source: (body.source || "pricing").slice(0, 40),
    },
    { onConflict: "email" },
  );

  if (error) {
    return NextResponse.json({ error: "STORE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
