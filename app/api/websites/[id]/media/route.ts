import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { getMediaStorage } from "@/lib/storage";
import { createId } from "@/lib/utils";
import type { ProductSectionConfig } from "@/types/website";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function extensionFor(contentType: string, filename: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("mp4") || contentType.includes("video")) return "mp4";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "bin";
}

function bumpVersion(
  site: {
    id: string;
    version: number;
    updatedAt: string;
    config: unknown;
  },
  store: { versions: unknown[] },
) {
  site.updatedAt = new Date().toISOString();
  site.version += 1;
  store.versions.push({
    id: createId("ver"),
    websiteId: site.id,
    version: site.version,
    config: structuredClone(site.config),
    createdAt: site.updatedAt,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  const website = await getWebsiteForWorkspace(id, session.workspace.id);
  if (!website) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const files = [
    ...form.getAll("files"),
    ...form.getAll("file"),
  ].filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!files.length) {
    return NextResponse.json({ error: "NO_FILES" }, { status: 400 });
  }
  if (files.length > 12) {
    return NextResponse.json({ error: "TOO_MANY_FILES" }, { status: 400 });
  }

  const productIndexRaw = form.get("productIndex");
  const productIndex =
    productIndexRaw != null && String(productIndexRaw) !== ""
      ? Number(productIndexRaw)
      : null;
  const alt = String(form.get("alt") ?? "").trim().slice(0, 120);

  const storage = getMediaStorage();
  const uploaded: Array<{
    id: string;
    url: string;
    type: "image" | "video";
    alt: string;
  }> = [];

  try {
    for (const file of files) {
      const contentType = (file.type || "application/octet-stream").toLowerCase();
      if (!ALLOWED.has(contentType)) {
        return NextResponse.json(
          { error: "UNSUPPORTED_TYPE", message: contentType },
          { status: 400 },
        );
      }
      const isVideo = contentType.startsWith("video/");
      const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > max) {
        return NextResponse.json(
          { error: "FILE_TOO_LARGE", message: String(file.size) },
          { status: 400 },
        );
      }

      const mediaId = createId("media");
      const ext = extensionFor(contentType, file.name || "");
      const key = `${website.slug || website.id}/uploads/${mediaId}.${ext}`;
      const body = Buffer.from(await file.arrayBuffer());
      const stored = await storage.upload({
        key,
        body,
        contentType,
      });

      uploaded.push({
        id: mediaId,
        url: stored.publicUrl,
        type: isVideo ? "video" : "image",
        alt: alt || file.name?.slice(0, 80) || mediaId,
      });
    }
  } catch (error) {
    console.error("[media upload] storage failed", error);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }

  let nextVersion: number | null = null;
  let attachedIndex: number | null = null;

  try {
    await writeStore((store) => {
      const site = store.websites.find(
        (item) => item.id === id && item.workspaceId === session.workspace.id,
      );
      if (!site) return;

      if (!site.config.media) site.config.media = {};
      for (const item of uploaded) {
        site.config.media[item.id] = {
          url: item.url,
          alt: item.alt,
          type: item.type,
          videoUrl: item.type === "video" ? item.url : null,
        };
      }

      if (
        productIndex != null &&
        Number.isInteger(productIndex) &&
        productIndex >= 0
      ) {
        const section = site.config.content.products as
          | ProductSectionConfig
          | undefined;
        const products = section?.items ?? [];
        if (products[productIndex]) {
          const ids = [
            ...uploaded.map((u) => u.id),
            ...products[productIndex]!.imageIds,
          ];
          products[productIndex]!.imageIds = [...new Set(ids)].slice(0, 12);
          attachedIndex = productIndex;
        }
      }

      bumpVersion(site, store);
      nextVersion = site.version;
    });
  } catch (error) {
    console.error("[media upload] write failed", error);
    return NextResponse.json({ error: "WRITE_FAILED" }, { status: 500 });
  }

  if (nextVersion == null) {
    return NextResponse.json({ error: "WRITE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    version: nextVersion,
    media: uploaded,
    attachedIndex,
  });
}
