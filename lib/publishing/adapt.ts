import type {
  AdaptedContent,
  ChannelType,
  ContentItem,
} from "@/types/publishing";

/**
 * Deterministic content adaptation — no invented claims.
 * Soft AI layer: reshapes structure/tone per channel from the source caption.
 */
export function adaptContentForChannel(
  content: ContentItem,
  channel: ChannelType,
  siteUrl?: string,
): AdaptedContent {
  const caption = (content.caption ?? "").trim();
  const title =
    content.title?.trim() ||
    caption.split("\n")[0]?.slice(0, 80) ||
    "Untitled";
  const link = siteUrl?.replace(/\/$/, "") || "";

  switch (channel) {
    case "website":
      return {
        channelType: "website",
        title,
        caption:
          caption ||
          "A featured piece from your latest Instagram content, ready for the storefront.",
        ctaLabel: "View on store",
        ctaUrl: link || undefined,
        notes: "Structured for your website content block.",
      };
    case "telegram": {
      const short = caption.slice(0, 280);
      const withLink = link
        ? `${short}\n\n🔗 ${link}`
        : short;
      return {
        channelType: "telegram",
        title,
        caption: withLink || `${title}${link ? `\n\n🔗 ${link}` : ""}`,
        ctaLabel: "Open website",
        ctaUrl: link || undefined,
        notes: "Concise post with CTA link.",
      };
    }
    case "instagram":
      return {
        channelType: "instagram",
        title,
        caption: caption || title,
        notes: "Original Instagram framing.",
      };
    case "whatsapp":
      return {
        channelType: "whatsapp",
        title,
        caption: "",
        notes: "Coming soon.",
      };
  }
}

export function suggestChannelsForContent(
  content: ContentItem,
): ChannelType[] {
  const suggested = content.aiAnalysis?.suggestedChannels;
  if (suggested?.length) return suggested.filter((c) => c !== "whatsapp");
  if (content.type === "product") return ["website", "telegram"];
  return ["website", "telegram", "instagram"];
}

export function analyzeContentHeuristically(
  content: Pick<ContentItem, "title" | "caption" | "type">,
): NonNullable<ContentItem["aiAnalysis"]> {
  const text = `${content.title ?? ""} ${content.caption ?? ""}`.toLowerCase();
  const products: string[] = [];
  if (/serum|کرم|روغن|oil|cream|serum/.test(text)) {
    products.push(content.title || "Skincare");
  }
  return {
    topic: content.type === "reel" ? "Reel" : "Post",
    tone: /new|جدید|launch|معرفی/.test(text) ? "launch" : "editorial",
    products: products.length ? products : undefined,
    suggestedChannels: ["website", "telegram", "instagram"],
  };
}
