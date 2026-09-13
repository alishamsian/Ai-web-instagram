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
import type { WebsiteConfig } from "@/types/website";

export function getMediaStorage() {
  if (isR2Configured()) return new R2MediaStorage();
  if (isSupabaseConfigured()) return new SupabaseMediaStorage();
  return new LocalMediaStorage();
}

/** Real hosting is available — never leave Instagram CDN hotlinks in the product. */
export function mustHostMedia() {
  return isSupabaseConfigured() || isR2Configured() || !allowMockServices();
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

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  if (items.length === 0) return;
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index]!);
    }
  };
  const pool = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: pool }, () => run()));
}

async function uploadOne(params: {
  key: string;
  body: Uint8Array;
  contentType: string;
  originalUrl: string;
  mediaType: "image" | "video";
  workspaceId: string;
  result: Record<string, StoredMedia>;
  mediaId: string;
  urlMap: Map<string, string>;
  setOriginalUrl: (url: string, assetId: string) => void;
}) {
  const storage = getMediaStorage();
  const stored = await storage.upload({
    key: params.key,
    body: params.body,
    contentType: params.contentType,
  });
  params.urlMap.set(params.originalUrl, stored.publicUrl);
  params.setOriginalUrl(stored.publicUrl, stored.id);
  params.result[params.mediaId] = {
    ...stored,
    originalUrl: params.originalUrl,
    publicUrl: stored.publicUrl,
  };
  await recordMediaAsset({
    workspaceId: params.workspaceId,
    originalUrl: params.originalUrl,
    storageKey: params.key,
    publicUrl: stored.publicUrl,
    type: params.mediaType,
  });
  return stored;
}

/**
 * Download Instagram CDN assets, store them, rewrite import URLs.
 * When hosting is configured, refuses to leave any hotlinked IG CDN URLs.
 */
export async function persistImportMedia(
  imported: InstagramImport,
): Promise<Record<string, StoredMedia>> {
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

  const attemptPersist = async (urls: string[]) => {
    if (urls.length === 0) return { persisted: 0, failed: 0 };
    const downloaded = await downloadMediaUrls(urls);
    let persisted = 0;
    let failed = 0;

    const pending = imported.media.filter(
      (m) => isInstagramCdnUrl(m.originalUrl) && urls.includes(m.originalUrl),
    );

    // Modest concurrency — parallel large videos often trip Storage "fetch failed".
    await mapPool(pending, 3, async (media) => {
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
        return;
      }

      const originalUrl = media.originalUrl;
      const ext = extensionFor(file.contentType, originalUrl);
      const key = `${imported.username}/${media.id}.${ext}`;
      try {
        await uploadOne({
          key,
          body: file.body,
          contentType:
            file.contentType ||
            (media.type === "video" ? "video/mp4" : "image/jpeg"),
          originalUrl,
          mediaType: media.type,
          workspaceId: imported.workspaceId,
          result,
          mediaId: media.id,
          urlMap,
          setOriginalUrl: (url, assetId) => {
            media.originalUrl = url;
            media.storedAssetId = assetId;
          },
        });
        persisted += 1;
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
    });

    return { persisted, failed };
  };

  let totals = await attemptPersist(candidates);

  // Second pass for anything still on Instagram CDN (transient CDN / Storage blips).
  const stillIg = imported.media
    .filter((m) => isInstagramCdnUrl(m.originalUrl))
    .map((m) => m.originalUrl);
  if (stillIg.length > 0) {
    console.warn(
      `[media] retrying ${stillIg.length} assets after first persist pass`,
    );
    await new Promise((r) => setTimeout(r, 800));
    const retry = await attemptPersist(stillIg);
    totals = {
      persisted: totals.persisted + retry.persisted,
      failed: retry.failed,
    };
  }

  applyUrlMap(imported, urlMap);

  // Mark non-IG items that were never candidates.
  for (const media of imported.media) {
    if (result[media.id]) continue;
    result[media.id] = {
      id: media.id,
      originalUrl: media.originalUrl,
      storageKey: `${imported.username}/${media.id}`,
      publicUrl: media.originalUrl,
      type: media.type,
      createdAt: new Date(),
    };
  }

  const igLeft = imported.media.filter((m) => isInstagramCdnUrl(m.originalUrl))
    .length;
  if (mustHostMedia() && igLeft > 0) {
    throw new Error(
      `MEDIA_PERSIST_FAILED: stored ${totals.persisted}/${candidates.length} Instagram assets (${igLeft} still on CDN, ${totals.failed} failed).`,
    );
  }

  return result;
}

/** Every Instagram CDN URL still present on a website config (media + brand logo). */
export function instagramHotlinksInConfig(config: WebsiteConfig): string[] {
  const urls = new Set<string>();
  if (config.brand?.logo && isInstagramCdnUrl(config.brand.logo)) {
    urls.add(config.brand.logo);
  }
  for (const asset of Object.values(config.media ?? {})) {
    if (asset.url && isInstagramCdnUrl(asset.url)) urls.add(asset.url);
    if (asset.videoUrl && isInstagramCdnUrl(asset.videoUrl)) {
      urls.add(asset.videoUrl);
    }
  }
  return [...urls];
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

async function hostUrlMap(
  urls: string[],
  slugHint: string,
  workspaceId?: string,
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  if (urls.length === 0) return urlMap;

  const storage = getMediaStorage();
  const downloaded = await downloadMediaUrls(urls);
  const entries = [...downloaded.entries()];
  await mapPool(entries, 3, async ([original, file]) => {
    const ext = extensionFor(file.contentType, original);
    const hash = Buffer.from(original).toString("base64url").slice(0, 16);
    const key = `${slugHint}/cfg-${hash}.${ext}`;
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
    } catch (error) {
      console.error("[media] config upload failed", key, error);
    }
  });

  return urlMap;
}

/**
 * Last-line safety net: host any remaining Instagram CDN URLs on a website
 * config (including brand.logo). Throws MEDIA_PERSIST_FAILED if any remain
 * when hosting is required.
 */
export async function ensureWebsiteConfigMediaHosted(
  config: WebsiteConfig,
  opts: { slugHint: string; workspaceId?: string },
): Promise<number> {
  let hotlinks = instagramHotlinksInConfig(config);
  if (hotlinks.length === 0) return 0;

  const apply = (urlMap: Map<string, string>) => {
    if (urlMap.size === 0) return;
    rewriteWebsiteMediaUrls(config.media, urlMap);
    if (config.brand.logo && urlMap.has(config.brand.logo)) {
      config.brand.logo = urlMap.get(config.brand.logo);
    }
  };

  apply(await hostUrlMap(hotlinks, opts.slugHint, opts.workspaceId));

  hotlinks = instagramHotlinksInConfig(config);
  if (hotlinks.length > 0) {
    console.warn(
      `[media] config still has ${hotlinks.length} IG URLs — retrying`,
    );
    await new Promise((r) => setTimeout(r, 800));
    apply(await hostUrlMap(hotlinks, opts.slugHint, opts.workspaceId));
  }

  hotlinks = instagramHotlinksInConfig(config);
  if (mustHostMedia() && hotlinks.length > 0) {
    throw new Error(
      `MEDIA_PERSIST_FAILED: ${hotlinks.length} Instagram CDN URLs remain on website config after hosting attempts.`,
    );
  }

  return (
    Object.values(config.media).filter(
      (a) =>
        !isInstagramCdnUrl(a.url) &&
        (!a.videoUrl || !isInstagramCdnUrl(a.videoUrl)),
    ).length
  );
}

/** Host remaining IG CDN URLs inside a media map (legacy helper). */
export async function persistWebsiteConfigMedia(
  slugHint: string,
  media: WebsiteConfig["media"],
  workspaceId?: string,
): Promise<number> {
  const urls = new Set<string>();
  for (const asset of Object.values(media)) {
    if (isInstagramCdnUrl(asset.url)) urls.add(asset.url);
    if (asset.videoUrl && isInstagramCdnUrl(asset.videoUrl)) {
      urls.add(asset.videoUrl);
    }
  }
  if (urls.size === 0) return 0;
  const urlMap = await hostUrlMap([...urls], slugHint, workspaceId);
  rewriteWebsiteMediaUrls(media, urlMap);
  return urlMap.size;
}
