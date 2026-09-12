import type {
  ContentItem,
  Publication,
  PublishingChannel,
} from "@/types/publishing";
import { CHANNEL_META } from "@/types/publishing";
import { analyzeContentHeuristically } from "@/lib/publishing/adapt";
import type { InstagramImport } from "@/types/instagram";
import type { WebsiteRecord } from "@/types/website";
import { publishedSiteUrl } from "@/lib/config/runtime";

export interface ChannelRepository {
  listChannels(workspaceId: string): Promise<PublishingChannel[]>;
}

export interface ContentRepository {
  listContent(workspaceId: string): Promise<ContentItem[]>;
}

export interface PublicationRepository {
  listForContent(contentId: string): Promise<Publication[]>;
}

/** Demo brand — clearly fictional, for empty-workspace preview only. */
export const DEMO_BRAND = {
  name: "LUNA STUDIO",
  handle: "@lunastudio",
  site: "lunastudio.ir",
} as const;

const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
  "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80",
  "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&q=80",
];

export function buildDemoChannels(): PublishingChannel[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-website",
      type: "website",
      name: CHANNEL_META.website.labelEn,
      identifier: DEMO_BRAND.site,
      status: "connected",
      connectedAt: now,
      lastActivityAt: now,
      metadata: { demo: true },
    },
    {
      id: "demo-telegram",
      type: "telegram",
      name: CHANNEL_META.telegram.labelEn,
      identifier: DEMO_BRAND.handle,
      status: "connected",
      connectedAt: now,
      lastActivityAt: now,
      metadata: { demo: true },
    },
    {
      id: "demo-instagram",
      type: "instagram",
      name: CHANNEL_META.instagram.labelEn,
      identifier: DEMO_BRAND.handle,
      status: "connected",
      connectedAt: now,
      lastActivityAt: now,
      metadata: { demo: true },
    },
    {
      id: "demo-whatsapp",
      type: "whatsapp",
      name: CHANNEL_META.whatsapp.labelEn,
      status: "coming_soon",
      metadata: { demo: true },
    },
  ];
}

export function buildDemoContent(): ContentItem[] {
  const posts = [
    {
      title: "New Hydrating Serum",
      caption:
        "Meet our new Hydrating Serum — a daily glow formula for soft, calm skin. Lightweight. Layerable. Made for real routines.",
    },
    {
      title: "Daily Glow Cream",
      caption:
        "Daily Glow Cream for mornings that need softness. Barrier-friendly moisture without the weight.",
    },
    {
      title: "Night Ritual Oil",
      caption:
        "Night Ritual Oil — a few drops before bed. Slow evening care, quiet skin.",
    },
    {
      title: "Soft Cleanse",
      caption:
        "Soft Cleanse — gentle foam, no tight afterfeel. The first step of the LUNA ritual.",
    },
  ];
  return posts.map((p, i) => {
    const item: ContentItem = {
      id: `demo-content-${i + 1}`,
      source: "instagram",
      type: i === 2 ? "reel" : "post",
      title: p.title,
      caption: p.caption,
      media: [
        {
          id: `demo-media-${i + 1}`,
          type: "image",
          url: DEMO_IMAGES[i % DEMO_IMAGES.length]!,
          alt: p.title,
        },
      ],
      createdAt: new Date(Date.now() - i * 3600_000 * 5).toISOString(),
      externalId: `demo_${i}`,
    };
    item.aiAnalysis = analyzeContentHeuristically(item);
    return item;
  });
}

export function channelsFromWorkspace(input: {
  websites: WebsiteRecord[];
  imports: Array<{
    id: string;
    username: string;
    createdAt: string;
    updatedAt: string;
    profile?: {
      profilePicUrlHD?: string | null;
      profilePicUrl?: string | null;
    } | null;
  }>;
  locale: "fa" | "en";
  telegramChatId?: string | null;
}): PublishingChannel[] {
  const isFa = input.locale === "fa";
  const primary = input.websites[0];
  const imp = primary
    ? input.imports.find((i) => i.id === primary.importId) ?? input.imports[0]
    : input.imports[0];
  const handle = imp?.username ? `@${imp.username}` : undefined;
  const siteHost = primary?.slug
    ? publishedSiteUrl(primary.slug).replace(/^https?:\/\//, "")
    : undefined;
  const telegramId = input.telegramChatId?.trim() || undefined;
  const telegramConnected = Boolean(telegramId);

  const channels: PublishingChannel[] = [
    {
      id: primary ? `website:${primary.id}` : "website:none",
      type: "website",
      name: isFa ? CHANNEL_META.website.labelFa : CHANNEL_META.website.labelEn,
      identifier: siteHost,
      status: primary ? "connected" : "disconnected",
      connectedAt: primary?.createdAt,
      lastActivityAt: primary?.updatedAt,
      metadata: primary ? { websiteId: primary.id, status: primary.status } : {},
    },
    {
      id: imp ? `instagram:${imp.id}` : "instagram:none",
      type: "instagram",
      name: isFa
        ? CHANNEL_META.instagram.labelFa
        : CHANNEL_META.instagram.labelEn,
      identifier: handle,
      status: imp ? "connected" : "disconnected",
      avatar:
        imp?.profile?.profilePicUrlHD ||
        imp?.profile?.profilePicUrl ||
        undefined,
      connectedAt: imp?.createdAt,
      lastActivityAt: imp?.updatedAt,
      metadata: imp ? { importId: imp.id, username: imp.username } : {},
    },
    {
      id: "telegram:workspace",
      type: "telegram",
      name: isFa ? CHANNEL_META.telegram.labelFa : CHANNEL_META.telegram.labelEn,
      identifier: telegramId,
      status: telegramConnected ? "connected" : "disconnected",
      connectedAt: telegramConnected ? new Date().toISOString() : undefined,
      metadata: telegramId ? { chatId: telegramId } : {},
    },
    {
      id: "whatsapp:future",
      type: "whatsapp",
      name: isFa ? CHANNEL_META.whatsapp.labelFa : CHANNEL_META.whatsapp.labelEn,
      status: "coming_soon",
      metadata: {},
    },
  ];
  return channels;
}

export function contentFromImports(
  imports: InstagramImport[],
  workspaceId: string,
): ContentItem[] {
  const items: ContentItem[] = [];
  for (const imp of imports) {
    for (const post of [...imp.posts, ...imp.reels]) {
      const urls = [
        ...(post.displayUrl ? [post.displayUrl] : []),
        ...post.images,
      ].filter((u): u is string => Boolean(u));
      const unique = [...new Set(urls)];
      const media: ContentItem["media"] = unique.slice(0, 8).map((url, i) => ({
        id: `${post.id}_m${i}`,
        type: (post.type === "video" || post.type === "reel"
          ? "video"
          : "image") as "image" | "video",
        url,
        thumbnailUrl: post.displayUrl || url,
        alt: post.alt || undefined,
      }));
      if (!media.length && post.videoUrl) {
        media.push({
          id: `${post.id}_v`,
          type: "video",
          url: post.videoUrl,
          thumbnailUrl: post.displayUrl ?? undefined,
          alt: post.alt ?? undefined,
        });
      }
      const caption = post.caption?.trim() || "";
      const title = caption.split("\n")[0]?.slice(0, 80) || undefined;
      const externalId = post.shortcode || post.id;
      const item: ContentItem = {
        id: `ig:${imp.id}:${externalId}`,
        workspaceId,
        source: "instagram",
        type: post.type === "reel" ? "reel" : "post",
        title,
        caption: caption || undefined,
        media,
        createdAt: post.timestamp || imp.createdAt,
        externalId,
      };
      item.aiAnalysis = analyzeContentHeuristically(item);
      items.push(item);
    }
  }
  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 60);
}
