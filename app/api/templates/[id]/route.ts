import { NextResponse } from "next/server";
import { getTemplateById, toCatalogItem } from "@/lib/templates";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const template = getTemplateById(id);
  if (!template) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    template: {
      ...toCatalogItem(template),
      pages: template.pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        sectionCount: p.sections.length,
      })),
      navigation: template.navigation,
      brand: {
        colors: template.brand.colors,
        typography: template.brand.typography,
        design: template.brand.design,
        tagline: template.brand.tagline,
      },
      description: template.description,
      metadata: template.metadata,
    },
  });
}
