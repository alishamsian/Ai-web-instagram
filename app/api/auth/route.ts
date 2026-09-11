import { NextResponse } from "next/server";
import {
  clearSession,
  createDemoSession,
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
} from "@/lib/auth/session";
import { allowDemoAuth } from "@/lib/config/runtime";
import { assertSameOrigin } from "@/lib/auth/origin";
import { validatePasswordStrength } from "@/lib/auth/password";
import {
  clientIpFromRequest,
  consumeRateLimit,
  getAuthLimits,
  resetRateLimits,
} from "@/lib/auth/rate-limit";
import { verifyTurnstile } from "@/lib/auth/turnstile";

// Local/dev: clear stale buckets whenever this module reloads.
if (process.env.NODE_ENV !== "production") {
  resetRateLimits();
}

function rateLimited(retryAfterSec: number) {
  return NextResponse.json(
    { error: "RATE_LIMITED", message: "Too many attempts. Try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    password?: string;
    captchaToken?: string;
    action?:
      | "login"
      | "signup"
      | "logout"
      | "demo"
      | "forgot-password"
      | "update-password";
  };

  const ip = clientIpFromRequest(request);
  const limits = getAuthLimits();

  if (body.action === "logout") {
    await clearSession();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "demo") {
    if (!allowDemoAuth()) {
      return NextResponse.json({ error: "DEMO_DISABLED" }, { status: 403 });
    }
    const limited = consumeRateLimit({
      key: `auth:demo:${ip}`,
      ...limits.demo,
    });
    if (!limited.ok) return rateLimited(limited.retryAfterSec);
    try {
      const session = await createDemoSession();
      return NextResponse.json({ user: session.user });
    } catch {
      return NextResponse.json({ error: "AUTH_FAILED" }, { status: 500 });
    }
  }

  const captcha = await verifyTurnstile(body.captchaToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.code }, { status: 400 });
  }

  if (body.action === "forgot-password") {
    const email = body.email?.trim().toLowerCase() ?? "";
    const limited = consumeRateLimit({
      key: `auth:forgot:${ip}:${email || "none"}`,
      ...limits.forgot,
    });
    if (!limited.ok) return rateLimited(limited.retryAfterSec);
    const result = await requestPasswordReset(email);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.code, message: result.message },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update-password") {
    const strength = validatePasswordStrength(body.password ?? "");
    if (!strength.ok) {
      return NextResponse.json(
        { error: strength.code, message: strength.message },
        { status: 400 },
      );
    }
    const limited = consumeRateLimit({
      key: `auth:reset:${ip}`,
      ...limits.reset,
    });
    if (!limited.ok) return rateLimited(limited.retryAfterSec);
    const result = await updatePassword(body.password ?? "");
    if (!result.ok) {
      return NextResponse.json(
        { error: result.code, message: result.message },
        { status: result.code === "UNAUTHORIZED" ? 401 : 400 },
      );
    }
    return NextResponse.json({ user: result.session.user });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  if (body.action === "signup") {
    const strength = validatePasswordStrength(password, email);
    if (!strength.ok) {
      return NextResponse.json(
        { error: strength.code, message: strength.message },
        { status: 400 },
      );
    }

    const limited = consumeRateLimit({
      key: `auth:signup:${ip}`,
      ...limits.signup,
    });
    if (!limited.ok) return rateLimited(limited.retryAfterSec);

    try {
      const result = await signUpWithPassword({
        email,
        password,
        name: body.name,
      });
      if (!result.ok) {
        if (result.code === "EMAIL_CONFIRMATION_REQUIRED") {
          return NextResponse.json(
            { error: "CONFIRM_EMAIL", message: result.message },
            { status: 202 },
          );
        }
        return NextResponse.json(
          { error: result.code, message: result.message },
          { status: 400 },
        );
      }
      return NextResponse.json({ user: result.session.user });
    } catch (error) {
      console.error("[auth] signup", error);
      return NextResponse.json(
        {
          error: "AUTH_FAILED",
          message:
            error instanceof Error ? error.message : "Signup failed.",
        },
        { status: 500 },
      );
    }
  }

  // Login — rate-limit only failed attempts.
  try {
    const result = await signInWithPassword({ email, password });
    if (!result.ok) {
      const limited = consumeRateLimit({
        key: `auth:login:fail:${ip}:${email}`,
        ...limits.login,
      });
      if (!limited.ok) return rateLimited(limited.retryAfterSec);
      return NextResponse.json(
        { error: result.code, message: result.message },
        { status: 401 },
      );
    }
    return NextResponse.json({ user: result.session.user });
  } catch (error) {
    console.error("[auth] login", error);
    return NextResponse.json(
      {
        error: "AUTH_FAILED",
        message: error instanceof Error ? error.message : "Login failed.",
      },
      { status: 500 },
    );
  }
}
