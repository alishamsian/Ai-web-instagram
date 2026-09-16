import { slugify } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";

/** Slugs that must never be claimed as public website hosts. */
const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "login",
  "signup",
  "auth",
  "static",
  "assets",
  "cdn",
  "mail",
  "ftp",
  "s",
  "preview",
  "editor",
  "billing",
  "support",
  "status",
  "health",
  "null",
  "undefined",
]);

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/**
 * Allocate a globally unique website slug.
 * Prefers the base; appends -2, -3, … on collision across other workspaces.
 * Same workspace may keep/reuse its existing slug via websiteId.
 */
export async function allocateUniqueSlug(params: {
  base: string;
  workspaceId: string;
  websiteId?: string;
}) {
  let base = slugify(params.base) || "site";
  if (isReservedSlug(base)) {
    base = `site-${base}`;
  }

  const taken = async (candidate: string) => {
    if (isReservedSlug(candidate)) return true;

    if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
      const db = getSupabaseAdmin();
      const { data } = await db
        .from("websites")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!data) return false;
      // Only the same website may reuse its slug — other sites in the
      // workspace still collide (global unique(slug)).
      if (params.websiteId && data.id === params.websiteId) return false;
      return true;
    }

    const store = await readStore();
    return store.websites.some((site) => {
      if (site.slug !== candidate) return false;
      if (params.websiteId && site.id === params.websiteId) return false;
      return true;
    });
  };

  if (!(await taken(base))) return base;

  for (let i = 2; i < 500; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}
