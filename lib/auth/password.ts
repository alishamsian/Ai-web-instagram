/**
 * Password strength rules for signup / reset.
 * Kept intentionally strict for a SaaS with customer sites.
 */
export function validatePasswordStrength(
  password: string,
  email?: string,
): { ok: true } | { ok: false; code: "WEAK_PASSWORD"; message: string } {
  if (password.length < 8) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password must be at least 8 characters.",
    };
  }
  if (password.length > 128) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password is too long.",
    };
  }
  if (!/[a-zA-Z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password must include letters and numbers.",
    };
  }
  if (/\s/.test(password)) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password must not contain spaces.",
    };
  }
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password must not contain your email name.",
    };
  }
  const lowered = password.toLowerCase();
  const banned = ["password", "1234567890", "qwerty123", "vitrin12345"];
  if (banned.some((item) => lowered.includes(item))) {
    return {
      ok: false,
      code: "WEAK_PASSWORD",
      message: "Password is too common.",
    };
  }
  return { ok: true };
}
