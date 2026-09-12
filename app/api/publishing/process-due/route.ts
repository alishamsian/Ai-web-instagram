import { NextResponse } from "next/server";
import { assertJobWorkerAuthorized } from "@/lib/config/runtime";
import {
  listDuePublications,
  updatePublicationRow,
} from "@/lib/publishing/persist";
import { getPublisher } from "@/lib/publishing/publishers";
import { createInboxNotification } from "@/lib/notifications/inbox";

export const maxDuration = 120;

async function run() {
  const due = await listDuePublications(15);
  let processed = 0;

  for (const item of due) {
    if (!item.channel || !item.content) {
      await updatePublicationRow(item.publication.id, {
        status: "failed",
        error: "Missing channel or content",
      });
      continue;
    }

    await updatePublicationRow(item.publication.id, { status: "publishing" });

    const adapted = {
      channelType: item.channel.type,
      caption:
        item.publication.adaptedCaption || item.content.caption || "",
      title: item.publication.adaptedTitle || item.content.title,
    };

    const result = await getPublisher(item.channel.type).publish({
      content: item.content,
      channel: item.channel,
      adapted,
    });

    await updatePublicationRow(item.publication.id, {
      status: result.publication.status,
      publishedAt: result.publication.publishedAt ?? null,
      error: result.publication.error ?? null,
    });

    if (!result.ok) {
      await createInboxNotification({
        workspaceId: item.workspaceId,
        kind: "publish_failed",
        title: "Scheduled publish failed",
        body: result.publication.error || item.channel.type,
        href: "dashboard/content/queue",
        tone: "danger",
        meta: { publicationId: item.publication.id },
      });
    } else {
      await createInboxNotification({
        workspaceId: item.workspaceId,
        kind: "publish_ok",
        title: "Scheduled post published",
        body: item.channel.name,
        href: "dashboard/content/queue",
        tone: "success",
        meta: { publicationId: item.publication.id },
      });
    }
    processed += 1;
  }

  return { ok: true, processed, claimed: due.length };
}

export async function GET(request: Request) {
  if (!assertJobWorkerAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await run());
}

export async function POST(request: Request) {
  if (!assertJobWorkerAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await run());
}
