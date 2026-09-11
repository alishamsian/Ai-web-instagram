import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";

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

  await writeStore((store) => {
    const website = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!website) return;
    website.status = published ? "published" : "unpublished";
    website.config.settings.published = published;
    website.publishedAt = published ? new Date().toISOString() : null;
    website.updatedAt = new Date().toISOString();
    updated = website;
  });

  if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(updated);
}
