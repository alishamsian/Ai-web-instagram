export function turnstileConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.TURNSTILE_SECRET_KEY,
  );
}

/**
 * Captcha is required only when explicitly enabled, or in production
 * once both Turnstile keys are present.
 */
export function turnstileRequired() {
  if (process.env.AUTH_REQUIRE_CAPTCHA === "true") return true;
  if (process.env.AUTH_REQUIRE_CAPTCHA === "false") return false;
  if (process.env.NODE_ENV === "production" && turnstileConfigured()) {
    return true;
  }
  return false;
}

/**
 * Verify Cloudflare Turnstile token.
 * Dev/local: skip unless AUTH_REQUIRE_CAPTCHA=true.
 * Production: require + verify when keys are configured.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  if (!turnstileRequired()) return { ok: true };

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, code: "CAPTCHA_REQUIRED" };
  }

  if (!token) return { ok: false, code: "CAPTCHA_REQUIRED" };

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token);
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(8_000),
      },
    );
    const data = (await response.json()) as { success?: boolean };
    if (!data.success) return { ok: false, code: "CAPTCHA_FAILED" };
    return { ok: true };
  } catch {
    // Don't lock users out if Cloudflare is down — fail open outside strict mode.
    if (process.env.AUTH_REQUIRE_CAPTCHA === "true") {
      return { ok: false, code: "CAPTCHA_FAILED" };
    }
    console.warn("[auth] Turnstile verify timed out or failed; allowing request.");
    return { ok: true };
  }
}
