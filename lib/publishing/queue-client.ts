"use client";

import { PUBLISH_QUEUE_KEY, type QueueEntry } from "@/lib/dashboard/ops";
import type { PublicationResult } from "@/types/publishing";

export function readPublishQueue(workspaceId: string): QueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${PUBLISH_QUEUE_KEY}:${workspaceId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueueEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePublishQueue(workspaceId: string, entries: QueueEntry[]) {
  try {
    localStorage.setItem(
      `${PUBLISH_QUEUE_KEY}:${workspaceId}`,
      JSON.stringify(entries.slice(0, 100)),
    );
  } catch {
    /* ignore */
  }
}

export function appendPublishResults(input: {
  workspaceId: string;
  contentId: string;
  contentTitle: string;
  results: PublicationResult[];
  channelNames: Record<string, string>;
}) {
  const existing = readPublishQueue(input.workspaceId);
  const next: QueueEntry[] = [
    ...input.results.map((r) => ({
      id: r.publication.id,
      contentId: input.contentId,
      contentTitle: input.contentTitle,
      channelType: r.publication.channelType,
      channelName:
        input.channelNames[r.publication.channelType] ??
        r.publication.channelType,
      status:
        r.publication.status === "published"
          ? ("published" as const)
          : r.publication.status === "scheduled"
            ? ("scheduled" as const)
            : r.publication.status === "publishing"
              ? ("publishing" as const)
              : ("failed" as const),
      error: r.publication.error,
      at:
        r.publication.publishedAt ||
        r.publication.createdAt ||
        new Date().toISOString(),
      scheduledAt: r.publication.scheduledAt,
      workspaceId: input.workspaceId,
    })),
    ...existing,
  ];
  writePublishQueue(input.workspaceId, next);
  return next;
}

/** Prefer cloud queue; fall back to local cache. */
export async function loadPublishQueue(
  workspaceId: string,
): Promise<{ entries: QueueEntry[]; source: "db" | "local" }> {
  try {
    const res = await fetch("/api/publishing/queue", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { entries?: QueueEntry[] };
      const entries = Array.isArray(data.entries) ? data.entries : [];
      if (entries.length > 0 || res.status === 200) {
        writePublishQueue(workspaceId, entries);
        return { entries, source: "db" };
      }
    }
  } catch {
    /* fall through */
  }
  return { entries: readPublishQueue(workspaceId), source: "local" };
}

export async function cancelScheduled(id: string) {
  const res = await fetch(`/api/publishing/queue?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}
