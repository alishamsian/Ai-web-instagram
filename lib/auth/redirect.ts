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
