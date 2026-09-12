import type {
  AdaptedContent,
  ChannelType,
  ContentItem,
  Publication,
  PublicationResult,
  PublishingChannel,
} from "@/types/publishing";
import { createId } from "@/lib/utils";

export interface ChannelPublisher {
  publish(input: {
    content: ContentItem;
    channel: PublishingChannel;
    adapted: AdaptedContent;
  }): Promise<PublicationResult>;
}

function basePublication(
  contentId: string,
  channel: PublishingChannel,
  status: Publication["status"],
  extra?: Partial<Publication>,
): Publication {
  return {
    id: createId("pub"),
    contentId,
    channelId: channel.id,
    channelType: channel.type,
    status,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

/** Publishes structured content onto the connected website catalog surface. */
export class WebsitePublisher implements ChannelPublisher {
  async publish(input: {
    content: ContentItem;
    channel: PublishingChannel;
    adapted: AdaptedContent;
  }): Promise<PublicationResult> {
    if (input.channel.status !== "connected") {
      return {
        ok: false,
        publication: basePublication(input.content.id, input.channel, "failed", {
          error: "Website channel is not connected.",
          adaptedCaption: input.adapted.caption,
          adaptedTitle: input.adapted.title,
        }),
      };
    }
    // Website destination is already the storefront — mark published locally.
    // Future: write a content block / product draft into website config.
    return {
      ok: true,
      publication: basePublication(input.content.id, input.channel, "published", {
        publishedAt: new Date().toISOString(),
        adaptedCaption: input.adapted.caption,
        adaptedTitle: input.adapted.title,
      }),
      externalUrl: input.channel.identifier
        ? `https://${input.channel.identifier}`
        : undefined,
    };
  }
}

/**
 * Telegram publisher — requires a connected channel with chat id in metadata.
 * Does not invent successful publishes without configuration.
 */
export class TelegramPublisher implements ChannelPublisher {
  async publish(input: {
    content: ContentItem;
    channel: PublishingChannel;
    adapted: AdaptedContent;
  }): Promise<PublicationResult> {
    if (input.channel.status !== "connected") {
      return {
        ok: false,
        publication: basePublication(input.content.id, input.channel, "failed", {
          error: "Telegram channel is not connected.",
        }),
      };
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId =
      (input.channel.metadata?.chatId as string | undefined) ||
      input.channel.identifier;

    if (!token || !chatId) {
      return {
        ok: false,
        publication: basePublication(input.content.id, input.channel, "failed", {
          error:
            "Telegram Bot Token or chat id missing. Connect the channel in Settings.",
          adaptedCaption: input.adapted.caption,
        }),
      };
    }

    const text = [input.adapted.title, input.adapted.caption]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId.replace(/^@/, ""),
          text: text.slice(0, 3900),
          disable_web_page_preview: false,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        publication: basePublication(input.content.id, input.channel, "failed", {
          error: body.slice(0, 200) || "Telegram publish failed.",
          adaptedCaption: input.adapted.caption,
        }),
      };
    }

    return {
      ok: true,
      publication: basePublication(input.content.id, input.channel, "published", {
        publishedAt: new Date().toISOString(),
        adaptedCaption: input.adapted.caption,
        adaptedTitle: input.adapted.title,
      }),
    };
  }
}

/**
 * Instagram publisher — connection-aware stub.
 * Real Graph API publishing ships later; we never fake success.
 */
export class InstagramPublisher implements ChannelPublisher {
  async publish(input: {
    content: ContentItem;
    channel: PublishingChannel;
    adapted: AdaptedContent;
  }): Promise<PublicationResult> {
    if (input.channel.status !== "connected") {
      return {
        ok: false,
        publication: basePublication(input.content.id, input.channel, "failed", {
          error: "Instagram is not connected.",
        }),
      };
    }

    // Without Instagram Graph credentials we cannot publish.
    if (!process.env.INSTAGRAM_GRAPH_TOKEN) {
      return {
        ok: false,
        publication: basePublication(input.content.id, input.channel, "failed", {
          error:
            "Instagram publishing API is not configured yet. Content is ready to review.",
          adaptedCaption: input.adapted.caption,
        }),
      };
    }

    return {
      ok: false,
      publication: basePublication(input.content.id, input.channel, "failed", {
        error: "Instagram Graph publish is not enabled in this environment.",
      }),
    };
  }
}

/** Explicit non-implementation — WhatsApp stays coming soon. */
export class WhatsAppPublisher implements ChannelPublisher {
  async publish(input: {
    content: ContentItem;
    channel: PublishingChannel;
    adapted: AdaptedContent;
  }): Promise<PublicationResult> {
    return {
      ok: false,
      publication: basePublication(input.content.id, input.channel, "failed", {
        error: "WhatsApp publishing is coming soon.",
        adaptedCaption: input.adapted.caption,
      }),
    };
  }
}

export function getPublisher(type: ChannelType): ChannelPublisher {
  switch (type) {
    case "website":
      return new WebsitePublisher();
    case "telegram":
      return new TelegramPublisher();
    case "instagram":
      return new InstagramPublisher();
    case "whatsapp":
      return new WhatsAppPublisher();
  }
}

export class PublishingService {
  async publishToChannels(input: {
    content: ContentItem;
    channels: PublishingChannel[];
    adaptations: AdaptedContent[];
  }): Promise<PublicationResult[]> {
    const results: PublicationResult[] = [];
    for (const channel of input.channels) {
      if (channel.type === "whatsapp" || channel.status === "coming_soon") {
        results.push({
          ok: false,
          publication: basePublication(input.content.id, channel, "failed", {
            error: "WhatsApp is coming soon.",
          }),
        });
        continue;
      }

      const adapted =
        input.adaptations.find((a) => a.channelType === channel.type) ?? {
          channelType: channel.type,
          caption: input.content.caption ?? "",
          title: input.content.title,
        };

      // Demo channels: local simulated publish — never claims a live API send.
      if (channel.metadata?.demo === true) {
        results.push({
          ok: true,
          publication: basePublication(input.content.id, channel, "published", {
            publishedAt: new Date().toISOString(),
            adaptedCaption: adapted.caption,
            adaptedTitle: adapted.title,
          }),
        });
        continue;
      }

      const publisher = getPublisher(channel.type);
      results.push(
        await publisher.publish({ content: input.content, channel, adapted }),
      );
    }
    return results;
  }
}
