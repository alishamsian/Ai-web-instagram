import type {
  InstagramImport,
  InstagramMedia,
  InstagramPost,
  InstagramProfile,
  ScrapeStatus,
} from "@/types/instagram";
import { createId, uniqueBy } from "@/lib/utils";
import { splitReels } from "@/lib/instagram/normalizer";

function collectMedia(
  profile: InstagramProfile,
  posts: InstagramPost[],
): InstagramMedia[] {
  const media: InstagramMedia[] = [];

  if (profile.profilePicUrlHD || profile.profilePicUrl) {
    media.push({
      id: `media_profile_${profile.id}`,
      postId: null,
      source: "profile",
      originalUrl: profile.profilePicUrlHD ?? profile.profilePicUrl ?? "",
      type: "image",
    });
  }

  for (const post of posts) {
    const urls =
      post.type === "carousel" && post.childPosts?.length
        ? post.childPosts.flatMap((child) => child.images)
        : post.images;

    urls.forEach((url, index) => {
      media.push({
        id: `media_${post.id}_${index}`,
        postId: post.id,
        source: post.type === "carousel" ? "carousel" : post.type === "reel" ? "reel" : "post",
        originalUrl: url,
        type: post.type === "video" || post.type === "reel" ? "video" : "image",
      });
    });

    if (post.videoUrl) {
      media.push({
        id: `media_${post.id}_video`,
        postId: post.id,
        source: post.type === "reel" ? "reel" : "post",
        originalUrl: post.videoUrl,
        type: "video",
      });
    }
  }

  return uniqueBy(
    media.filter((item) => item.originalUrl),
    (item) => item.originalUrl,
  );
}

export function mergeInstagramData(input: {
  workspaceId: string;
  sourceUrl: string;
  profile: InstagramProfile;
  posts: InstagramPost[];
  requestedLimit: number;
  collector: string;
}): InstagramImport {
  const allPosts = uniqueBy(input.posts, (post) => post.shortcode || post.id);
  const { posts, reels } = splitReels(allPosts);

  let scrapeStatus: ScrapeStatus = "PARTIAL";
  if (input.profile.isPrivate) scrapeStatus = "PRIVATE";
  else if (allPosts.length >= 50) scrapeStatus = "FULL_50";
  else if (allPosts.length >= input.requestedLimit) scrapeStatus = "FULL_20";
  else if (allPosts.length > 0) scrapeStatus = "PARTIAL";

  const now = new Date().toISOString();

  return {
    id: createId("imp"),
    workspaceId: input.workspaceId,
    sourceUrl: input.sourceUrl,
    username: input.profile.username,
    profile: input.profile,
    posts,
    reels,
    media: collectMedia(input.profile, [...posts, ...reels]),
    scrapeStatus,
    collector: input.collector,
    createdAt: now,
    updatedAt: now,
  };
}
