/**
 * Only allow same-origin relative paths for post-login redirects.
 * Blocks open redirects like //evil.com or https://evil.com.
 */
export function safeAuthNext(
  raw: string | null | undefined,
  locale: string,
): string {
  const fallback = `/${locale}/dashboard`;
  if (!raw) return fallback;

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\x00-\x1f]/.test(value)) return fallback;

  // Keep users inside locale-aware app routes (or shared /s, /auth, /editor…)
  const allowed =
    /^\/(fa|en)(\/|$)/.test(value) ||
    /^\/(s|auth|editor|preview|api)(\/|$)/.test(value) ||
    value === "/";

  if (!allowed) return fallback;
  return value;
}

/** Default home for staff admins after login. */
export function adminHomePath(locale: string): string {
  return `/${locale}/admin/dashboard`;
}

/**
 * Choose post-login destination.
 * Honors an explicit `next` when present; otherwise admins land in Founder Console.
 */
export function resolvePostLoginPath(params: {
  locale: string;
  rawNext?: string | null;
  isAdmin?: boolean;
}): string {
  const productHome = `/${params.locale}/dashboard`;
  const hasExplicitNext = Boolean(params.rawNext?.trim());
  const safe = safeAuthNext(params.rawNext, params.locale);

  if (hasExplicitNext) return safe;
  if (params.isAdmin) return adminHomePath(params.locale);
  return productHome;
}
