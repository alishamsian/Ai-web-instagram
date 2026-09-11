import type { InstagramPost, InstagramProfile } from "@/types/instagram";

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function extractHashtags(caption: string | null) {
  if (!caption) return [];
  return Array.from(caption.matchAll(/#([\p{L}\p{N}_]+)/gu)).map((match) => match[1]);
}

function extractMentions(caption: string | null) {
  if (!caption) return [];
  return Array.from(caption.matchAll(/@([A-Za-z0-9._]+)/g)).map((match) => match[1]);
}

function detectPostType(raw: Record<string, unknown>): InstagramPost["type"] {
  const type = String(raw.type ?? raw.productType ?? raw.media_type ?? "").toLowerCase();
  if (type.includes("reel")) return "reel";
  if (type.includes("sidecar") || type.includes("carousel")) return "carousel";
  if (type.includes("video")) return "video";
  if (Array.isArray(raw.childPosts) && (raw.childPosts as unknown[]).length > 1) {
    return "carousel";
  }
  if (raw.videoUrl || raw.video_url) return "video";
  return "image";
}

export function normalizeProfile(
  raw: Record<string, unknown>,
  fallbackUrl?: string,
): InstagramProfile {
  const username =
    asString(raw.username) ??
    asString(raw.handle) ??
    "unknown";

  return {
    id: String(raw.id ?? raw.pk ?? username),
    username,
    fullName: asString(raw.fullName) ?? asString(raw.full_name),
    biography: asString(raw.biography) ?? asString(raw.bio),
    profileUrl:
      asString(raw.url) ??
      asString(raw.profileUrl) ??
      fallbackUrl ??
      `https://www.instagram.com/${username}/`,
    profilePicUrl:
      asString(raw.profilePicUrl) ??
      asString(raw.profile_pic_url) ??
      asString(raw.profilePic),
    profilePicUrlHD:
      asString(raw.profilePicUrlHD) ??
      asString(raw.profile_pic_url_hd) ??
      asString(raw.hdProfilePicUrl),
    followersCount: asNumber(raw.followersCount) ?? asNumber(raw.followers_count),
    followsCount: asNumber(raw.followsCount) ?? asNumber(raw.follows_count),
    postsCount: asNumber(raw.postsCount) ?? asNumber(raw.media_count),
    isBusinessAccount: asBoolean(raw.isBusinessAccount) || asBoolean(raw.is_business_account),
    isPrivate: asBoolean(raw.isPrivate) || asBoolean(raw.is_private),
    isVerified: asBoolean(raw.isVerified) || asBoolean(raw.is_verified),
    businessCategory:
      asString(raw.businessCategoryName) ??
      asString(raw.business_category_name) ??
      asString(raw.category),
    externalUrl: asString(raw.externalUrl) ?? asString(raw.external_url),
    scrapedAt: new Date(),
  };
}

export function normalizePost(
  raw: Record<string, unknown>,
  owner: { username: string; id: string },
): InstagramPost {
  const caption = asString(raw.caption) ?? asString((raw.caption as { text?: string } | undefined)?.text);
  const type = detectPostType(raw);
  const images = [
    asString(raw.displayUrl),
    asString(raw.display_url),
    asString(raw.imageUrl),
    ...(Array.isArray(raw.images) ? raw.images.map((item) => asString(item)) : []),
  ].filter((item): item is string => Boolean(item));

  const childrenRaw = Array.isArray(raw.childPosts)
    ? raw.childPosts
    : Array.isArray(raw.sidecarChildren)
      ? raw.sidecarChildren
      : [];

  const childPosts =
    childrenRaw.length > 0
      ? childrenRaw
          .filter((child): child is Record<string, unknown> => Boolean(child) && typeof child === "object")
          .map((child) => normalizePost(child, owner))
      : undefined;

  const id = String(raw.id ?? raw.pk ?? raw.shortCode ?? raw.shortcode ?? crypto.randomUUID());

  return {
    id,
    shortcode: String(raw.shortCode ?? raw.shortcode ?? id),
    url:
      asString(raw.url) ??
      `https://www.instagram.com/p/${String(raw.shortCode ?? raw.shortcode ?? id)}/`,
    type,
    caption,
    hashtags: Array.isArray(raw.hashtags)
      ? raw.hashtags.map(String)
      : extractHashtags(caption),
    mentions: Array.isArray(raw.mentions)
      ? raw.mentions.map(String)
      : extractMentions(caption),
    likesCount: asNumber(raw.likesCount) ?? asNumber(raw.likes_count),
    commentsCount: asNumber(raw.commentsCount) ?? asNumber(raw.comments_count),
    viewsCount: asNumber(raw.videoViewCount) ?? asNumber(raw.videoPlayCount) ?? asNumber(raw.viewsCount),
    timestamp: asString(raw.timestamp) ?? asString(raw.taken_at) ?? new Date().toISOString(),
    displayUrl: images[0] ?? null,
    videoUrl: asString(raw.videoUrl) ?? asString(raw.video_url),
    images: Array.from(new Set(images)),
    alt: asString(raw.alt) ?? asString(raw.accessibility_caption),
    ownerUsername: asString(raw.ownerUsername) ?? owner.username,
    ownerId: asString(raw.ownerId) ?? owner.id,
    childPosts,
    rawData: undefined,
  };
}

export function splitReels(posts: InstagramPost[]) {
  const reels = posts.filter((post) => post.type === "reel");
  const feed = posts.filter((post) => post.type !== "reel");
  return { posts: feed, reels };
}
