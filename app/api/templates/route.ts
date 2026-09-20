import { NextResponse } from "next/server";
import {
  getTemplateCatalog,
  listCatalogCategories,
  listCatalogStyles,
} from "@/lib/templates";
import type { TemplateCategory, TemplateFeature, TemplateStyle } from "@/lib/templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as TemplateCategory | "all" | null;
  const style = searchParams.get("style") as TemplateStyle | "all" | null;
  const feature = searchParams.get("feature") as TemplateFeature | null;
  const query = searchParams.get("q") || searchParams.get("query") || undefined;
  const tag = searchParams.get("tag") || undefined;

  const templates = getTemplateCatalog({
    category: category || undefined,
    style: style || undefined,
    feature: feature || undefined,
    query,
    tag,
  });

  return NextResponse.json({
    templates,
    categories: listCatalogCategories(),
    styles: listCatalogStyles(),
  });
}
