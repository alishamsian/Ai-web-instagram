import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { PublishingService } from "@/lib/publishing/publishers";
import { persistPublishBatch } from "@/lib/publishing/persist";
import { createInboxNotification } from "@/lib/notifications/inbox";
import {
  adaptedContentSchema,
  contentItemSchema,
  publishingChannelSchema,
} from "@/schemas/publishing";

const bodySchema = z.object({
  content: contentItemSchema,
  channels: z.array(publishingChannelSchema).min(1),
  adaptations: z.array(adaptedContentSchema),
  /** ISO or datetime-local string — when set, queue as scheduled. */
  scheduleAt: z.string().min(8).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const channels = parsed.data.channels.filter(
    (c) => c.type !== "whatsapp" && c.status !== "coming_soon",
  );
  if (channels.length === 0) {
    return NextResponse.json({ error: "NO_CHANNELS" }, { status: 400 });
  }

  const workspaceId = session.workspace.id;

  if (parsed.data.scheduleAt) {
    const when = new Date(parsed.data.scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: "INVALID_SCHEDULE" }, { status: 400 });
    }
    const scheduled = await persistPublishBatch({
      workspaceId,
      content: parsed.data.content,
      channels,
      adaptations: parsed.data.adaptations,
      scheduleAt: when.toISOString(),
    });
    if (!scheduled || scheduled.length === 0) {
      return NextResponse.json({ error: "SCHEDULE_FAILED" }, { status: 500 });
    }
    return NextResponse.json({ results: scheduled, scheduled: true });
  }

  const service = new PublishingService();
  const results = await service.publishToChannels({
    content: parsed.data.content,
    channels,
    adaptations: parsed.data.adaptations,
  });

  const persisted = await persistPublishBatch({
    workspaceId,
    content: parsed.data.content,
    channels,
    adaptations: parsed.data.adaptations,
    results,
  });

  const finalResults = persisted ?? results;

  for (const result of finalResults) {
    if (!result.ok) {
      await createInboxNotification({
        workspaceId,
        kind: "publish_failed",
        title: "Publish failed",
        body:
          result.publication.error ||
          `${result.publication.channelType} failed`,
        href: "dashboard/content/queue",
        tone: "danger",
        meta: {
          publicationId: result.publication.id,
          channelType: result.publication.channelType,
        },
      });
    }
  }

  return NextResponse.json({ results: finalResults });
}
