import { APP_URL } from "@/lib/config/env";

/** Reject cross-site POST to auth APIs (basic CSRF for cookie sessions). */
export function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(APP_URL).origin);
  } catch {
    // ignore
  }
  if (host) {
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    allowed.add(`${proto}://${host}`);
  }

  if (origin) {
    return allowed.has(origin);
  }

  // Some browsers omit Origin on same-site navigations; fall back to Referer.
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Non-browser clients (curl) — allow in non-production only.
  return process.env.NODE_ENV !== "production";
}
