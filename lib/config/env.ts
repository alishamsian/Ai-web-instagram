export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Vitrin";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export const LOCALES = ["fa", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fa";

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  );
}

export function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  );
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  );
}

/** Browser / SSR client can connect with URL + publishable key. */
export function isSupabasePublicConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

/**
 * Full persistence (admin store writes) needs the service role / secret key.
 * Without it, the app falls back to `.data/store.json`.
 */
export function isSupabaseConfigured() {
  return Boolean(isSupabasePublicConfigured() && getSupabaseServiceRoleKey());
}

export function isApifyConfigured() {
  return Boolean(process.env.APIFY_API_TOKEN);
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

export function isAIConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

export function getRuntimeMode() {
  return {
    auth: isSupabaseConfigured() ? "supabase" : "mock",
    collector: isApifyConfigured() ? "apify" : "mock",
    storage: isR2Configured()
      ? "r2"
      : isSupabaseConfigured()
        ? "supabase"
        : "local",
    ai: isAIConfigured() ? "openai" : "mock",
  } as const;
}
