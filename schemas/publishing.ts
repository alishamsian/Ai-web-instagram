import { z } from "zod";
import {
  channelTypeSchema,
  contentItemSchema,
  publishingChannelSchema,
} from "@/types/publishing";

export { contentItemSchema, publishingChannelSchema };

export const adaptedContentSchema = z.object({
  channelType: channelTypeSchema,
  title: z.string().optional(),
  caption: z.string(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  notes: z.string().optional(),
});
