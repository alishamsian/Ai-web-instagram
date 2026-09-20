import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";
import { createId, slugify } from "@/lib/utils";
import { instantiateTemplate, getTemplate } from "@/lib/templates";
import { recordProductEvent } from "@/lib/admin/events";

const bodySchema = z.object({
  templateId: z.string().min(1),
  brandName: z.string().min(1).max(80).optional(),
  locale: z.enum(["fa", "en"]).optional(),
});

function uniqueSlug(base: string, existing: string[]): string {
  const root = slugify(base) || "site";
  if (!existing.includes(root)) return root;
  let i = 2;
  while (existing.includes(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

/**
 * POST /api/templates/instantiate
 * Creates an independent website from a full-site template.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const template = getTemplate(parsed.data.templateId);
  if (!template) {
    return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  }

  const lang = parsed.data.locale || "fa";

  try {
    const { config, pageIdMap, templateId } = instantiateTemplate(
      parsed.data.templateId,
      {
        brandName: parsed.data.brandName,
        locale: lang,
        language: lang,
        direction: lang === "fa" ? "rtl" : "ltr",
      },
    );

    const websiteId = createId("web");
    let slug = "";

    await writeStore((draft) => {
      const existingSlugs = draft.websites
        .filter((w) => w.workspaceId === session.workspace.id)
        .map((w) => w.slug);
      slug = uniqueSlug(config.brand.name || template.slug, existingSlugs);
      const createdAt = new Date().toISOString();
      draft.websites.unshift({
        id: websiteId,
        workspaceId: session.workspace.id,
        importId: "",
        slug,
        config,
        status: "draft",
        version: 1,
        createdAt,
        updatedAt: createdAt,
        publishedAt: null,
      });
      draft.versions.push({
        id: createId("ver"),
        websiteId,
        version: 1,
        config,
        createdAt,
      });
    });

    void recordProductEvent({
      eventName: "website_created",
      userId: session.user.id,
      workspaceId: session.workspace.id,
      websiteId,
      resourceType: "website",
      resourceId: websiteId,
      metadata: { source: "template", templateId },
    });

    return NextResponse.json({
      ok: true,
      websiteId,
      slug,
      templateId,
      pageIdMap,
      editorPath: `/editor/${websiteId}/visual`,
      classicPath: `/editor/${websiteId}`,
      previewPath: `/preview/${websiteId}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "INSTANTIATE_FAILED",
        message: err instanceof Error ? err.message : "Failed",
      },
      { status: 500 },
    );
  }
}
