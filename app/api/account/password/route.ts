import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { validatePasswordStrength } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { consumeRateLimit, clientIpFromRequest } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "SUPABASE_REQUIRED" }, { status: 503 });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const ip = clientIpFromRequest(request);
  const limited = consumeRateLimit({
    key: `auth:password:${ip}:${session.user.id}`,
    limit: 8,
    windowMs: 60 * 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
  };
  const password = body.password ?? "";
  const strength = validatePasswordStrength(password, session.user.email);
  if (!strength.ok) {
    return NextResponse.json(
      { error: strength.code, message: strength.message },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json(
      { error: "AUTH_FAILED", message: error.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
