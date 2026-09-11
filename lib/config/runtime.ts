import {
  APP_URL,
  getSupabasePublishableKey,
  getSupabaseUrl,
  isAIConfigured,
  isApifyConfigured,
  isR2Configured,
  isSupabaseConfigured,
  ROOT_DOMAIN,
} from "@/lib/config/env";

/** Mock Instagram/AI only in non-production, or when explicitly allowed. */
export function allowMockServices() {
  return (
    process.env.ALLOW_MOCK === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

/** Demo account / passwordless demo import only when allowed. */
export function allowDemoAuth() {
  return (
    process.env.ALLOW_DEMO_AUTH === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export function requireLiveCollector(username?: string) {
  const demo = username && process.env.NODE_ENV; // checked by caller via isDemoUsername
  void demo;
  if (allowMockServices()) return;
  if (!isApifyConfigured()) {
    throw new Error(
      "APIFY_API_TOKEN is required in production. Set ALLOW_MOCK=true to override.",
    );
  }
}

export function requireLiveAI(username?: string) {
  void username;
  if (allowMockServices()) return;
  if (!isAIConfigured()) {
    throw new Error(
      "AI_API_KEY is required in production. Set ALLOW_MOCK=true to override.",
    );
  }
}

export function requirePersistence() {
  if (process.env.NODE_ENV === "production" && !isSupabaseConfigured()) {
    throw new Error(
      "Supabase is required in production for durable storage.",
    );
  }
}

/** Shared secret for durable job worker HTTP triggers. */
export function getJobWorkerSecret() {
  return (
    process.env.JOB_WORKER_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  );
}

export function assertJobWorkerAuthorized(request: Request) {
  const secret = getJobWorkerSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = request.headers.get("x-job-secret") ?? "";
  return bearer === secret || alt === secret;
}

/**
 * Public URL for a published site.
 * Production: https://{slug}.{ROOT_DOMAIN}
 * Localhost: {APP_URL}/s/{slug} (subdomain rewrite also supported)
 */
export function publishedSiteUrl(slug: string) {
  const rootHost = ROOT_DOMAIN.replace(/^https?:\/\//, "").split("/")[0];
  if (
    rootHost.startsWith("localhost") ||
    rootHost.startsWith("127.0.0.1") ||
    process.env.NODE_ENV !== "production"
  ) {
    return `${APP_URL.replace(/\/$/, "")}/s/${slug}`;
  }
  const protocol = rootHost.includes("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${rootHost}`;
}

export function getRootHostname() {
  return ROOT_DOMAIN.replace(/^https?:\/\//, "").split(":")[0].split("/")[0];
}

export function describeRuntimeGaps() {
  return {
    supabase: isSupabaseConfigured(),
    apify: isApifyConfigured(),
    ai: isAIConfigured(),
    r2: isR2Configured(),
    supabaseUrl: Boolean(getSupabaseUrl()),
    publishable: Boolean(getSupabasePublishableKey()),
    allowMock: allowMockServices(),
  };
}
