import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { QueueEntry } from "@/lib/dashboard/ops";
import type {
  AdaptedContent,
  ContentItem,
  Publication,
  PublicationResult,
  PublishingChannel,
} from "@/types/publishing";
import { CHANNEL_META } from "@/types/publishing";
import { createId } from "@/lib/utils";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function publishingReady() {
  return isSupabaseConfigured() && (await isSupabaseSchemaReady());
}

/** Upsert a derived channel row; returns DB UUID. */
export async function ensurePublishingChannel(
  workspaceId: string,
  channel: PublishingChannel,
): Promise<string | null> {
  if (!(await publishingReady())) return null;
  if (channel.metadata?.demo === true) return null;

  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("publishing_channels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("type", channel.type)
    .maybeSingle();

  if (existing?.id) {
    await db
      .from("publishing_channels")
      .update({
        name: channel.name,
        identifier: channel.identifier ?? null,
        status: channel.status,
        avatar: channel.avatar ?? null,
        metadata: channel.metadata ?? {},
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        connected_at:
          channel.status === "connected"
            ? channel.connectedAt ?? new Date().toISOString()
            : null,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const id = isUuid(channel.id) ? channel.id : createId();
  const { data, error } = await db
    .from("publishing_channels")
    .insert({
      id,
      workspace_id: workspaceId,
      type: channel.type,
      name: channel.name,
      identifier: channel.identifier ?? null,
      status: channel.status,
      avatar: channel.avatar ?? null,
      metadata: channel.metadata ?? {},
      connected_at:
        channel.status === "connected"
          ? channel.connectedAt ?? new Date().toISOString()
          : null,
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return (data?.id as string) ?? id;
}

/** Persist content item; returns DB UUID. */
export async function ensureContentItem(
  workspaceId: string,
  content: ContentItem,
): Promise<string | null> {
  if (!(await publishingReady())) return null;

  const db = getSupabaseAdmin();
  const externalKey = content.externalId || content.id;

  const { data: existing } = await db
    .from("content_items")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("external_id", externalKey)
    .maybeSingle();

  if (existing?.id) {
    await db
      .from("content_items")
      .update({
        title: content.title ?? null,
        caption: content.caption ?? null,
        type: content.type,
        source: content.source,
        ai_analysis: content.aiAnalysis ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const id = isUuid(content.id) ? content.id : createId();
  const { data, error } = await db
    .from("content_items")
    .insert({
      id,
      workspace_id: workspaceId,
      source: content.source,
      type: content.type,
      title: content.title ?? null,
      caption: content.caption ?? null,
      external_id: externalKey,
      ai_analysis: content.aiAnalysis ?? {},
    })
    .select("id")
    .maybeSingle();

  if (error) return null;

  const contentId = (data?.id as string) ?? id;
  if (content.media?.length) {
    await db.from("content_media_assets").delete().eq("content_id", contentId);
    await db.from("content_media_assets").insert(
      content.media.slice(0, 12).map((m) => ({
        id: isUuid(m.id) ? m.id : createId(),
        content_id: contentId,
        type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnailUrl ?? null,
        alt: m.alt ?? null,
      })),
    );
  }
  return contentId;
}

export async function insertPublicationRow(input: {
  workspaceId: string;
  contentId: string;
  channelId: string;
  channelType: string;
  status: Publication["status"];
  adaptedTitle?: string;
  adaptedCaption?: string;
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
  id?: string;
}): Promise<Publication | null> {
  if (!(await publishingReady())) return null;
  const db = getSupabaseAdmin();
  const id = input.id && isUuid(input.id) ? input.id : createId();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("publications")
    .insert({
      id,
      workspace_id: input.workspaceId,
      content_id: input.contentId,
      channel_id: input.channelId,
      channel_type: input.channelType,
      status: input.status,
      adapted_title: input.adaptedTitle ?? null,
      adapted_caption: input.adaptedCaption ?? null,
      scheduled_at: input.scheduledAt ?? null,
      published_at: input.publishedAt ?? null,
      error: input.error ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) return null;
  return mapPublicationRow(data);
}

export async function updatePublicationRow(
  id: string,
  patch: Partial<{
    status: Publication["status"];
    publishedAt: string | null;
    error: string | null;
    adaptedTitle: string | null;
    adaptedCaption: string | null;
  }>,
): Promise<Publication | null> {
  if (!(await publishingReady())) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("publications")
    .update({
      status: patch.status,
      published_at: patch.publishedAt,
      error: patch.error,
      adapted_title: patch.adaptedTitle,
      adapted_caption: patch.adaptedCaption,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapPublicationRow(data);
}

function mapPublicationRow(row: Record<string, unknown>): Publication {
  return {
    id: String(row.id),
    contentId: String(row.content_id),
    channelId: String(row.channel_id),
    channelType: row.channel_type as Publication["channelType"],
    status: row.status as Publication["status"],
    adaptedTitle: (row.adapted_title as string) || undefined,
    adaptedCaption: (row.adapted_caption as string) || undefined,
    scheduledAt: (row.scheduled_at as string) || undefined,
    publishedAt: (row.published_at as string) || undefined,
    error: (row.error as string) || undefined,
    createdAt: (row.created_at as string) || undefined,
  };
}

export async function listQueueEntries(
  workspaceId: string,
  limit = 80,
): Promise<QueueEntry[]> {
  if (!(await publishingReady())) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("publications")
    .select(
      "id, content_id, channel_type, status, error, created_at, published_at, scheduled_at, content_items(title, caption), publishing_channels(name, type)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const content = row.content_items as
      | { title?: string | null; caption?: string | null }
      | { title?: string | null; caption?: string | null }[]
      | null;
    const contentObj = Array.isArray(content) ? content[0] : content;
    const channel = row.publishing_channels as
      | { name?: string; type?: string }
      | { name?: string; type?: string }[]
      | null;
    const channelObj = Array.isArray(channel) ? channel[0] : channel;
    const channelType = String(row.channel_type);
    const meta = CHANNEL_META[channelType as keyof typeof CHANNEL_META];
    const status = String(row.status);
    const mappedStatus: QueueEntry["status"] =
      status === "published"
        ? "published"
        : status === "scheduled"
          ? "scheduled"
          : status === "publishing"
            ? "publishing"
            : "failed";

    return {
      id: String(row.id),
      contentId: String(row.content_id),
      contentTitle:
        contentObj?.title ||
        contentObj?.caption?.slice(0, 48) ||
        "Content",
      channelType,
      channelName: channelObj?.name || meta?.labelEn || channelType,
      status: mappedStatus,
      error: (row.error as string) || undefined,
      at: String(row.published_at || row.created_at),
      scheduledAt: (row.scheduled_at as string) || undefined,
      workspaceId,
    };
  });
}

export async function cancelScheduledPublication(
  workspaceId: string,
  publicationId: string,
): Promise<boolean> {
  if (!(await publishingReady())) return false;
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("publications")
    .update({
      status: "failed",
      error: "Cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", publicationId)
    .eq("workspace_id", workspaceId)
    .eq("status", "scheduled");
  return !error;
}

export async function listDuePublications(limit = 20): Promise<
  Array<{
    publication: Publication;
    workspaceId: string;
    channel: PublishingChannel | null;
    content: ContentItem | null;
  }>
> {
  if (!(await publishingReady())) return [];
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("publications")
    .select(
      "*, publishing_channels(*), content_items(*, content_media_assets(*))",
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const ch = row.publishing_channels as Record<string, unknown> | null;
    const ci = row.content_items as Record<string, unknown> | null;
    const mediaRaw = (ci?.content_media_assets as Record<string, unknown>[]) ?? [];
    return {
      workspaceId: String(row.workspace_id),
      publication: mapPublicationRow(row),
      channel: ch
        ? {
            id: String(ch.id),
            type: ch.type as PublishingChannel["type"],
            name: String(ch.name),
            identifier: (ch.identifier as string) || undefined,
            status: ch.status as PublishingChannel["status"],
            avatar: (ch.avatar as string) || undefined,
            metadata: (ch.metadata as Record<string, unknown>) || {},
          }
        : null,
      content: ci
        ? {
            id: String(ci.id),
            workspaceId: String(ci.workspace_id),
            source: ci.source as ContentItem["source"],
            type: ci.type as ContentItem["type"],
            title: (ci.title as string) || undefined,
            caption: (ci.caption as string) || undefined,
            media: mediaRaw.map((m) => ({
              id: String(m.id),
              type: m.type as "image" | "video",
              url: String(m.url),
              thumbnailUrl: (m.thumbnail_url as string) || undefined,
              alt: (m.alt as string) || undefined,
            })),
            createdAt: String(ci.created_at),
            aiAnalysis: (ci.ai_analysis as ContentItem["aiAnalysis"]) || undefined,
            externalId: (ci.external_id as string) || undefined,
          }
        : null,
    };
  });
}

/** Persist immediate or scheduled publish outcomes. */
export async function persistPublishBatch(input: {
  workspaceId: string;
  content: ContentItem;
  channels: PublishingChannel[];
  adaptations: AdaptedContent[];
  results?: PublicationResult[];
  scheduleAt?: string;
  locale?: "fa" | "en";
}): Promise<PublicationResult[] | null> {
  if (!(await publishingReady())) return null;
  if (input.channels.every((c) => c.metadata?.demo === true)) return null;

  const contentId = await ensureContentItem(input.workspaceId, input.content);
  if (!contentId) return null;

  if (input.scheduleAt) {
    const scheduled: PublicationResult[] = [];
    for (const channel of input.channels) {
      if (channel.type === "whatsapp" || channel.status === "coming_soon") continue;
      if (channel.metadata?.demo === true) continue;
      const channelId = await ensurePublishingChannel(input.workspaceId, channel);
      if (!channelId) continue;
      const adapted =
        input.adaptations.find((a) => a.channelType === channel.type) ?? {
          channelType: channel.type,
          caption: input.content.caption ?? "",
          title: input.content.title,
        };
      const pub = await insertPublicationRow({
        workspaceId: input.workspaceId,
        contentId,
        channelId,
        channelType: channel.type,
        status: "scheduled",
        adaptedTitle: adapted.title,
        adaptedCaption: adapted.caption,
        scheduledAt: input.scheduleAt,
      });
      if (pub) {
        scheduled.push({ ok: true, publication: pub });
      }
    }
    return scheduled;
  }

  if (!input.results) return null;

  const out: PublicationResult[] = [];
  for (const result of input.results) {
    const channel = input.channels.find(
      (c) =>
        c.id === result.publication.channelId ||
        c.type === result.publication.channelType,
    );
    if (!channel || channel.metadata?.demo === true) {
      out.push(result);
      continue;
    }
    const channelId = await ensurePublishingChannel(input.workspaceId, channel);
    if (!channelId) {
      out.push(result);
      continue;
    }
    const pub = await insertPublicationRow({
      workspaceId: input.workspaceId,
      contentId,
      channelId,
      channelType: result.publication.channelType,
      status: result.publication.status,
      adaptedTitle: result.publication.adaptedTitle,
      adaptedCaption: result.publication.adaptedCaption,
      publishedAt: result.publication.publishedAt,
      error: result.publication.error,
      id: isUuid(result.publication.id) ? result.publication.id : undefined,
    });
    out.push(
      pub
        ? { ok: result.ok, publication: pub, externalUrl: result.externalUrl }
        : result,
    );
  }
  return out;
}
