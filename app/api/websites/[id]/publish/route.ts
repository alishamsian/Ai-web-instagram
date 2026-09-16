import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";
import { logInfo } from "@/lib/observability/log";

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
  let noProducts = false;

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
      const products = website.config.content.products?.items ?? [];
      if (products.length === 0) {
        noProducts = true;
        return;
      }
    }

    website.status = published ? "published" : "unpublished";
    website.config.settings.published = published;
    website.publishedAt = published ? new Date().toISOString() : null;
    website.updatedAt = new Date().toISOString();
    updated = website;
  });

  if (noProducts) {
    return NextResponse.json(
      {
        error: "NO_PRODUCTS",
        message: "Add at least one product before publishing.",
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
