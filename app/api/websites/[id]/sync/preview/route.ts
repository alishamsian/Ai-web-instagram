import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady, mapImport } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";
import type { ImportRow } from "@/lib/database/supabase-store";

/**
 * Estimate how many Instagram posts are new since last import.
 * Uses last-known profile.postsCount vs imported posts+reels.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const website = await getWebsiteForWorkspace(id, session.workspace.id);
  if (!website) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let lastSyncAt: string | null = null;
  let importedPosts = 0;
  let profilePostsCount: number | null = null;

  if (website.importId) {
    if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
      const db = getSupabaseAdmin();
      const { data } = await db
        .from("instagram_imports")
        .select("*")
        .eq("id", website.importId)
        .eq("workspace_id", session.workspace.id)
        .maybeSingle();
      if (data) {
        const imported = mapImport(data as ImportRow);
        importedPosts = imported.posts.length + imported.reels.length;
        profilePostsCount = imported.profile?.postsCount ?? null;
        lastSyncAt = imported.updatedAt;
      }
    } else {
      const store = await readStore();
      const imported = store.imports.find(
        (item) =>
          item.id === website.importId &&
          item.workspaceId === session.workspace.id,
      );
      if (imported) {
        importedPosts = imported.posts.length + imported.reels.length;
        profilePostsCount = imported.profile?.postsCount ?? null;
        lastSyncAt = imported.updatedAt;
      }
    }
  }

  const estimatedNew = Math.max(
    0,
    (profilePostsCount ?? 0) - importedPosts,
  );

  return NextResponse.json({
    lastSyncAt,
    importedPosts,
    profilePostsCount,
    estimatedNew,
  });
}
