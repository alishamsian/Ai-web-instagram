import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/database/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const store = await readStore();
  const websites = store.websites
    .filter((item) => item.workspaceId === session.workspace.id)
    .map((site) => {
      const imported = store.imports.find((item) => item.id === site.importId);
      return {
        id: site.id,
        slug: site.slug,
        status: site.status,
        version: site.version,
        updatedAt: site.updatedAt,
        publishedAt: site.publishedAt,
        brandName: site.config.brand.name,
        username: imported?.username ?? site.slug,
        logo: site.config.brand.logo ?? site.config.media.logo?.url ?? null,
        template: site.config.template,
      };
    });

  return NextResponse.json({ websites });
}
