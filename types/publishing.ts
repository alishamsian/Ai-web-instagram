import { z } from "zod";

export const channelTypeSchema = z.enum([
  "website",
  "telegram",
  "instagram",
  "whatsapp",
]);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const channelStatusSchema = z.enum([
  "connected",
  "disconnected",
  "error",
  "coming_soon",
]);
export type ChannelStatus = z.infer<typeof channelStatusSchema>;

export const contentSourceSchema = z.enum([
  "instagram",
  "manual",
  "generated",
]);
export type ContentSource = z.infer<typeof contentSourceSchema>;

export const contentTypeSchema = z.enum([
  "post",
  "reel",
  "product",
  "article",
  "announcement",
]);
export type ContentKind = z.infer<typeof contentTypeSchema>;

export const publicationStatusSchema = z.enum([
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
]);
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;

export const mediaAssetSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "video"]),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  alt: z.string().optional(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const contentAnalysisSchema = z.object({
  topic: z.string().optional(),
  tone: z.string().optional(),
  products: z.array(z.string()).optional(),
  suggestedChannels: z.array(channelTypeSchema).optional(),
});
export type ContentAnalysis = z.infer<typeof contentAnalysisSchema>;

export const publishingChannelSchema = z.object({
  id: z.string(),
  type: channelTypeSchema,
  name: z.string(),
  identifier: z.string().optional(),
  status: channelStatusSchema,
  avatar: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  connectedAt: z.string().optional(),
  lastActivityAt: z.string().optional(),
});
export type PublishingChannel = z.infer<typeof publishingChannelSchema>;

export const contentItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string().optional(),
  source: contentSourceSchema,
  type: contentTypeSchema,
  title: z.string().optional(),
  caption: z.string().optional(),
  media: z.array(mediaAssetSchema),
  createdAt: z.string(),
  aiAnalysis: contentAnalysisSchema.optional(),
  /** Originating Instagram shortcode / post id when imported */
  externalId: z.string().optional(),
});
export type ContentItem = z.infer<typeof contentItemSchema>;

export const publicationSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  channelId: z.string(),
  channelType: channelTypeSchema,
  status: publicationStatusSchema,
  adaptedCaption: z.string().optional(),
  adaptedTitle: z.string().optional(),
  publishedAt: z.string().optional(),
  scheduledAt: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string().optional(),
});
export type Publication = z.infer<typeof publicationSchema>;

export type PublicationResult = {
  ok: boolean;
  publication: Publication;
  externalUrl?: string;
};

export type AdaptedContent = {
  channelType: ChannelType;
  title?: string;
  caption: string;
  ctaLabel?: string;
  ctaUrl?: string;
  notes?: string;
};

export const CHANNEL_META: Record<
  ChannelType,
  { labelFa: string; labelEn: string; descriptionFa: string; descriptionEn: string }
> = {
  website: {
    labelFa: "وبسایت",
    labelEn: "Website",
    descriptionFa: "بلوک محتوا / محصول روی فروشگاه",
    descriptionEn: "Content or product block on your store",
  },
  telegram: {
    labelFa: "تلگرام",
    labelEn: "Telegram",
    descriptionFa: "پست کوتاه با لینک و CTA",
    descriptionEn: "Short post with CTA and website link",
  },
  instagram: {
    labelFa: "اینستاگرام",
    labelEn: "Instagram",
    descriptionFa: "محتوای اصلی یا نسخه ویرایش‌شده",
    descriptionEn: "Original or lightly edited post",
  },
  whatsapp: {
    labelFa: "واتساپ",
    labelEn: "WhatsApp",
    descriptionFa: "به‌زودی — ارسال مستقیم به واتساپ بیزنس",
    descriptionEn: "Coming soon — reach WhatsApp Business",
  },
};
