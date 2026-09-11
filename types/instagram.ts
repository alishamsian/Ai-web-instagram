export type InstagramMediaType = "image" | "video" | "carousel" | "reel";

export type ScrapeStatus =
  | "FULL_20"
  | "FULL_50"
  | "PARTIAL"
  | "PRIVATE"
  | "LOGIN_REQUIRED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SCRAPE_FAILED";

export interface InstagramProfile {
  id: string;
  username: string;
  fullName: string | null;
  biography: string | null;
  profileUrl: string;
  profilePicUrl: string | null;
  profilePicUrlHD: string | null;
  followersCount: number | null;
  followsCount: number | null;
  postsCount: number | null;
  isBusinessAccount: boolean;
  isPrivate: boolean;
  isVerified: boolean;
  businessCategory: string | null;
  externalUrl: string | null;
  scrapedAt: Date;
}

export interface InstagramPost {
  id: string;
  shortcode: string;
  url: string;
  type: InstagramMediaType;
  caption: string | null;
  hashtags: string[];
  mentions: string[];
  likesCount: number | null;
  commentsCount: number | null;
  viewsCount: number | null;
  timestamp: string;
  displayUrl: string | null;
  videoUrl: string | null;
  images: string[];
  alt: string | null;
  ownerUsername: string;
  ownerId: string;
  childPosts?: InstagramPost[];
  rawData?: unknown;
}

export interface InstagramMedia {
  id: string;
  postId: string | null;
  source: "profile" | "post" | "carousel" | "reel";
  originalUrl: string;
  type: "image" | "video";
  storedAssetId?: string;
}

export interface InstagramImport {
  id: string;
  workspaceId: string;
  sourceUrl: string;
  username: string;
  profile: InstagramProfile;
  posts: InstagramPost[];
  reels: InstagramPost[];
  media: InstagramMedia[];
  scrapeStatus: ScrapeStatus;
  collector: string;
  aiAnalysis?: import("./ai").WebsiteAIAnalysis;
  websiteConfig?: import("./website").WebsiteConfig;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramCollector {
  scrapeProfile(url: string): Promise<InstagramProfile>;
  scrapePosts(url: string, limit: number): Promise<InstagramPost[]>;
}

export class CollectorError extends Error {
  constructor(
    message: string,
    public readonly code: ScrapeStatus,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "CollectorError";
  }
}
