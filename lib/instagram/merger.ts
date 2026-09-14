import type {
  InstagramImport,
  InstagramMedia,
  InstagramPost,
  InstagramProfile,
  ScrapeStatus,
} from "@/types/instagram";
import { createId, uniqueBy } from "@/lib/utils";
import { splitReels } from "@/lib/instagram/normalizer";
import { normalizeImportMedia } from "@/lib/instagram/media";

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
  const media = normalizeImportMedia({
    profile: input.profile,
    posts: [...posts, ...reels],
  }).map((item) => {
    const { alt: _ignored, ...rest } = item;
    void _ignored;
    return rest as InstagramMedia;
  });

  return {
    id: createId("imp"),
    workspaceId: input.workspaceId,
    sourceUrl: input.sourceUrl,
    username: input.profile.username,
    profile: input.profile,
    posts,
    reels,
    media,
    scrapeStatus,
    collector: input.collector,
    createdAt: now,
    updatedAt: now,
  };
}
