import { slugify } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";

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
  const base = slugify(params.base) || "site";

  const taken = async (candidate: string) => {
    if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
      const db = getSupabaseAdmin();
      const { data } = await db
        .from("websites")
        .select("id, workspace_id")
        .eq("slug", candidate)
        .maybeSingle();
      if (!data) return false;
      if (params.websiteId && data.id === params.websiteId) return false;
      if (data.workspace_id === params.workspaceId) return false;
      return true;
    }

    const store = await readStore();
    return store.websites.some((site) => {
      if (site.slug !== candidate) return false;
      if (params.websiteId && site.id === params.websiteId) return false;
      if (site.workspaceId === params.workspaceId) return false;
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
