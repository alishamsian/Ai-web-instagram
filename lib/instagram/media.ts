import type { InstagramMedia, InstagramPost, InstagramProfile } from "@/types/instagram";
import { sanitizeHttpUrl } from "@/lib/business/schema";
import { uniqueBy } from "@/lib/utils";

export type NormalizedImportMedia = InstagramMedia & {
  alt: string | null;
};

function isValidMediaUrl(url: string): boolean {
  return Boolean(sanitizeHttpUrl(url));
}

function stableMediaId(parts: string[]) {
  return parts
    .join("_")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 120);
}

/**
 * Pure media list from profile + posts.
 * - stable ids
 * - http(s) only
 * - image/video distinction
 * - duplicate URL protection
 * - alt fallback
 */
export function normalizeImportMedia(input: {
  profile: InstagramProfile;
  posts: InstagramPost[];
}): NormalizedImportMedia[] {
  const media: NormalizedImportMedia[] = [];

  const avatar = sanitizeHttpUrl(
    input.profile.profilePicUrlHD ?? input.profile.profilePicUrl,
  );
  if (avatar) {
    media.push({
      id: stableMediaId(["media", "profile", input.profile.id || input.profile.username]),
      postId: null,
      source: "profile",
      originalUrl: avatar,
      type: "image",
      alt:
        input.profile.fullName?.trim() ||
        input.profile.username ||
        "Profile photo",
    });
  }

  for (const post of input.posts) {
    const urls =
      post.type === "carousel" && post.childPosts?.length
        ? post.childPosts.flatMap((child) => child.images)
        : post.images.length
          ? post.images
          : post.displayUrl
            ? [post.displayUrl]
            : [];

    urls.forEach((rawUrl, index) => {
      const url = sanitizeHttpUrl(rawUrl);
      if (!url || !isValidMediaUrl(url)) return;
      media.push({
        id: stableMediaId(["media", post.id, String(index)]),
        postId: post.id,
        source:
          post.type === "carousel"
            ? "carousel"
            : post.type === "reel"
              ? "reel"
              : "post",
        originalUrl: url,
        type: post.type === "video" || post.type === "reel" ? "video" : "image",
        alt: post.alt?.trim() || post.caption?.slice(0, 120) || null,
      });
    });

    const video = sanitizeHttpUrl(post.videoUrl);
    if (video) {
      media.push({
        id: stableMediaId(["media", post.id, "video"]),
        postId: post.id,
        source: post.type === "reel" ? "reel" : "post",
        originalUrl: video,
        type: "video",
        alt: post.alt?.trim() || post.caption?.slice(0, 120) || null,
      });
    }
  }

  return uniqueBy(media, (item) => item.originalUrl);
}
