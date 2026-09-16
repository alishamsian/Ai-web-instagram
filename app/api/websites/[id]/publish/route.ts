import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";
import { logInfo } from "@/lib/observability/log";
import { runPublishPreflight } from "@/lib/editor/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { published?: boolean };
  const published = body.published !== false;
  let updated = null;
  let preflightErrors: ReturnType<typeof runPublishPreflight>["errors"] = [];

  const { recordProductEvent } = await import("@/lib/admin/events");
  void recordProductEvent({
    eventName: "publish_flow_started",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId: id,
    resourceType: "website",
    resourceId: id,
    metadata: { published },
  });

  await writeStore((store) => {
    const website = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!website) return;

    if (published) {
      const preflight = runPublishPreflight(website.config);
      if (!preflight.ok) {
        preflightErrors = preflight.errors;
        return;
      }
    }

    // Idempotent: setting the same status is a no-op aside from updatedAt.
    website.status = published ? "published" : "unpublished";
    website.config.settings.published = published;
    if (published) {
      website.publishedAt = website.publishedAt ?? new Date().toISOString();
    } else {
      website.publishedAt = null;
    }
    website.updatedAt = new Date().toISOString();
    updated = website;
  });

  if (preflightErrors.length) {
    void recordProductEvent({
      eventName: "publish_failed",
      userId: session.user.id,
      workspaceId: session.workspace.id,
      websiteId: id,
      resourceType: "website",
      resourceId: id,
      metadata: { reason: "preflight" },
    });
    void recordProductEvent({
      eventName: "publish_flow_completed",
      userId: session.user.id,
      workspaceId: session.workspace.id,
      websiteId: id,
      resourceType: "website",
      resourceId: id,
      metadata: { published: false, failed: true, reason: "preflight" },
    });
    return NextResponse.json(
      {
        error: "PUBLISH_PREFLIGHT_FAILED",
        message: preflightErrors[0]?.message.en ?? "Publish validation failed.",
        messageFa: preflightErrors[0]?.message.fa,
        issues: preflightErrors.map((e) => ({
          id: e.id,
          category: e.category,
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  logInfo(published ? "website.publish" : "website.unpublish", {
    websiteId: id,
    workspaceId: session.workspace.id,
  });
  void recordProductEvent({
    eventName: published ? "website_published" : "website_unpublished",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId: id,
    resourceType: "website",
    resourceId: id,
  });
  void recordProductEvent({
    eventName: "publish_flow_completed",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId: id,
    resourceType: "website",
    resourceId: id,
    metadata: { published },
  });
  return NextResponse.json(updated);
}
