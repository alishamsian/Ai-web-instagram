import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readStore, writeStore } from "@/lib/database/store";
import { createId } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const store = await readStore();
  const website = store.websites.find(
    (item) => item.id === id && item.workspaceId === session.workspace.id,
  );
  if (!website) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const versions = store.versions
    .filter((item) => item.websiteId === id)
    .sort((a, b) => b.version - a.version)
    .slice(0, 40)
    .map((item) => ({
      id: item.id,
      version: item.version,
      createdAt: item.createdAt,
    }));

  return NextResponse.json({ versions, current: website.version });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { versionId?: string };
  if (!body.versionId) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let updated = null as
    | Awaited<ReturnType<typeof readStore>>["websites"][number]
    | null;

  await writeStore((store) => {
    if (!store.domains) store.domains = [];
    const website = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!website) return;
    const version = store.versions.find(
      (item) => item.id === body.versionId && item.websiteId === id,
    );
    if (!version) return;

    website.config = structuredClone(version.config);
    website.updatedAt = new Date().toISOString();
    website.version += 1;
    store.versions.push({
      id: createId("ver"),
      websiteId: website.id,
      version: website.version,
      config: website.config,
      createdAt: website.updatedAt,
    });
    updated = website;
  });

  if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(updated);
}
