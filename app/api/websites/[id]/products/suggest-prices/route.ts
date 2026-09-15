import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { suggestProductPrices } from "@/lib/ai/price-suggest";

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

  const body = (await request.json().catch(() => ({}))) as {
    indices?: number[];
  };
  const products = website.config.content.products?.items ?? [];
  const locale = website.config.settings.language;
  const indices = (
    body.indices?.length
      ? body.indices
      : products.map((_, i) => i)
  ).filter((i) => i >= 0 && i < products.length);

  const targets = indices
    .map((index) => {
      const p = products[index]!;
      return {
        index,
        name: p.name,
        description: p.description ?? "",
      };
    })
    .filter((row) => products[row.index]?.price == null);

  const suggestions = await suggestProductPrices(targets, locale, {
    workspaceId: session.workspace.id,
    userId: session.user.id,
  });
  return NextResponse.json({ suggestions });
}
