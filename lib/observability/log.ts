/**
 * Lightweight structured logging for production diagnostics.
 * Never pass secrets, cookies, or auth tokens in `fields`.
 */

export type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

function serialize(fields?: LogFields) {
  if (!fields) return "";
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("password") ||
      lower.includes("authorization") ||
      lower.includes("cookie") ||
      lower.includes("apikey") ||
      lower.includes("api_key")
    ) {
      continue;
    }
    safe[key] = value;
  }
  return Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
}

export function logInfo(event: string, fields?: LogFields) {
  console.info(`[vitrin] ${event}${serialize(fields)}`);
}

export function logWarn(event: string, fields?: LogFields) {
  console.warn(`[vitrin] ${event}${serialize(fields)}`);
}

export function logError(event: string, fields?: LogFields) {
  console.error(`[vitrin] ${event}${serialize(fields)}`);
}
