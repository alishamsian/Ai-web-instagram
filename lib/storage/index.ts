import {
  isR2Configured,
  isSupabaseConfigured,
} from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import {
  LocalMediaStorage,
  R2MediaStorage,
  SupabaseMediaStorage,
} from "@/lib/storage/providers";
import { downloadMediaUrls, isInstagramCdnUrl } from "@/lib/storage/download";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { createId } from "@/lib/utils";
import type { InstagramImport } from "@/types/instagram";
import type { StoredMedia } from "@/types/media";

export function getMediaStorage() {
  if (isR2Configured()) return new R2MediaStorage();
  if (isSupabaseConfigured()) return new SupabaseMediaStorage();
  return new LocalMediaStorage();
}

function extensionFor(contentType: string, url: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("mp4") || contentType.includes("video")) return "mp4";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".png")) return "png";
  return "jpg";
}

function rewriteUrl(
  value: string | null | undefined,
  map: Map<string, string>,
): string | null | undefined {
  if (!value) return value;
  return map.get(value) ?? value;
}

function applyUrlMap(imported: InstagramImport, map: Map<string, string>) {
  if (map.size === 0) return;

  imported.profile.profilePicUrl = rewriteUrl(
    imported.profile.profilePicUrl,
    map,
  ) as string | null;
  imported.profile.profilePicUrlHD = rewriteUrl(
    imported.profile.profilePicUrlHD,
    map,
  ) as string | null;

  for (const media of imported.media) {
    const next = map.get(media.originalUrl);
    if (next) media.originalUrl = next;
  }

  for (const post of [...imported.posts, ...imported.reels]) {
    post.displayUrl = rewriteUrl(post.displayUrl, map) as string | null;
    post.videoUrl = rewriteUrl(post.videoUrl, map) as string | null;
    post.images = post.images.map((url) => map.get(url) ?? url);
  }
}

async function recordMediaAsset(params: {
  workspaceId: string;
  originalUrl: string;
  storageKey: string;
  publicUrl: string;
  type: "image" | "video";
}) {
  if (!isSupabaseConfigured() || !(await isSupabaseSchemaReady())) return;
  const db = getSupabaseAdmin();
  await db.from("media_assets").upsert(
    {
      id: createId("media"),
      workspace_id: params.workspaceId,
      original_url: params.originalUrl,
      storage_key: params.storageKey,
      public_url: params.publicUrl,
      type: params.type,
    },
    { onConflict: "storage_key" },
  );
}

/**
 * Download Instagram CDN assets, store them, rewrite import URLs.
 * In production, refuses to leave hotlinked fbcdn URLs when persistence fails
 * for a majority of assets.
 */
export async function persistImportMedia(
  imported: InstagramImport,
): Promise<Record<string, StoredMedia>> {
  const storage = getMediaStorage();
  const result: Record<string, StoredMedia> = {};
  const urlMap = new Map<string, string>();

  const candidates = imported.media
    .map((item) => item.originalUrl)
    .filter((url) => url && isInstagramCdnUrl(url));

  if (candidates.length === 0) {
    for (const media of imported.media) {
      result[media.id] = {
        id: media.id,
        originalUrl: media.originalUrl,
        storageKey: `${imported.username}/${media.id}`,
        publicUrl: media.originalUrl,
        type: media.type,
        createdAt: new Date(),
      };
    }
    return result;
  }

  const downloaded = await downloadMediaUrls(candidates);
  let persisted = 0;
  let failed = 0;

  for (const media of imported.media) {
    if (!isInstagramCdnUrl(media.originalUrl)) {
      result[media.id] = {
        id: media.id,
        originalUrl: media.originalUrl,
        storageKey: `${imported.username}/${media.id}`,
        publicUrl: media.originalUrl,
        type: media.type,
        createdAt: new Date(),
      };
      continue;
    }

    const file = downloaded.get(media.originalUrl);
    if (!file) {
      failed += 1;
      result[media.id] = {
        id: media.id,
        originalUrl: media.originalUrl,
        storageKey: `${imported.username}/${media.id}`,
        publicUrl: media.originalUrl,
        type: media.type,
        createdAt: new Date(),
      };
      continue;
    }

    const originalUrl = media.originalUrl;
    const ext = extensionFor(file.contentType, originalUrl);
    const key = `${imported.username}/${media.id}.${ext}`;
    try {
      const stored = await storage.upload({
        key,
        body: file.body,
        contentType:
          file.contentType ||
          (media.type === "video" ? "video/mp4" : "image/jpeg"),
      });
      urlMap.set(originalUrl, stored.publicUrl);
      media.originalUrl = stored.publicUrl;
      media.storedAssetId = stored.id;
      persisted += 1;
      result[media.id] = {
        ...stored,
        originalUrl,
        publicUrl: stored.publicUrl,
      };
      await recordMediaAsset({
        workspaceId: imported.workspaceId,
        originalUrl,
        storageKey: key,
        publicUrl: stored.publicUrl,
        type: media.type,
      });
    } catch (error) {
      failed += 1;
      console.error("[media] upload failed", key, error);
      result[media.id] = {
        id: media.id,
        originalUrl: media.originalUrl,
        storageKey: key,
        publicUrl: media.originalUrl,
        type: media.type,
        createdAt: new Date(),
      };
    }
  }

  applyUrlMap(imported, urlMap);

  const igLeft = imported.media.filter((m) => isInstagramCdnUrl(m.originalUrl))
    .length;
  if (
    !allowMockServices() &&
    candidates.length > 0 &&
    (persisted === 0 || igLeft > candidates.length / 2)
  ) {
    throw new Error(
      `MEDIA_PERSIST_FAILED: stored ${persisted}/${candidates.length} Instagram assets (${failed} failed).`,
    );
  }

  return result;
}

export function rewriteWebsiteMediaUrls(
  media: Record<
    string,
    { url: string; videoUrl?: string | null; alt: string; type: "image" | "video" }
  >,
  urlMap: Map<string, string>,
) {
  for (const asset of Object.values(media)) {
    asset.url = urlMap.get(asset.url) ?? asset.url;
    if (asset.videoUrl) {
      asset.videoUrl = urlMap.get(asset.videoUrl) ?? asset.videoUrl;
    }
  }
}

export async function persistWebsiteConfigMedia(
  slugHint: string,
  media: Record<
    string,
    { url: string; videoUrl?: string | null; alt: string; type: "image" | "video" }
  >,
  workspaceId?: string,
): Promise<number> {
  const storage = getMediaStorage();
  const urls = new Set<string>();
  for (const asset of Object.values(media)) {
    if (isInstagramCdnUrl(asset.url)) urls.add(asset.url);
    if (asset.videoUrl && isInstagramCdnUrl(asset.videoUrl)) {
      urls.add(asset.videoUrl);
    }
  }
  if (urls.size === 0) return 0;

  const downloaded = await downloadMediaUrls([...urls]);
  const urlMap = new Map<string, string>();
  let index = 0;

  for (const [original, file] of downloaded) {
    const ext = extensionFor(file.contentType, original);
    const key = `${slugHint}/legacy-${index++}.${ext}`;
    try {
      const stored = await storage.upload({
        key,
        body: file.body,
        contentType: file.contentType,
      });
      urlMap.set(original, stored.publicUrl);
      if (workspaceId) {
        await recordMediaAsset({
          workspaceId,
          originalUrl: original,
          storageKey: key,
          publicUrl: stored.publicUrl,
          type: file.contentType.startsWith("video") ? "video" : "image",
        });
      }
    } catch {
      // leave original
    }
  }

  rewriteWebsiteMediaUrls(media, urlMap);
  return urlMap.size;
}
