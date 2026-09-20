/**
 * Lightweight template catalog API (no GrapesJS / full WebsiteConfig).
 */

import {
  getTemplate,
  getTemplates,
} from "@/lib/templates/registry";
import type {
  TemplateCatalogItem,
  TemplateCategory,
  TemplateFilter,
  TemplateStyle,
  WebsiteTemplate,
} from "@/lib/templates/types";

export function toCatalogItem(template: WebsiteTemplate): TemplateCatalogItem {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    category: template.category,
    style: template.style,
    tags: template.tags,
    features: template.features,
    pageCount: template.pages.length,
    thumbnail: template.thumbnail,
    legacyTemplate: template.legacyTemplate,
  };
}

export function getTemplateCatalog(
  filter?: TemplateFilter,
): TemplateCatalogItem[] {
  return filterTemplates(getTemplates(), filter).map(toCatalogItem);
}

export function getTemplateById(id: string): WebsiteTemplate | undefined {
  return getTemplate(id);
}

export function getTemplatesByCategory(
  category: TemplateCategory,
): TemplateCatalogItem[] {
  return getTemplateCatalog({ category });
}

export function searchTemplates(query: string): TemplateCatalogItem[] {
  return getTemplateCatalog({ query });
}

export function filterTemplates(
  templates: WebsiteTemplate[],
  filter?: TemplateFilter,
): WebsiteTemplate[] {
  if (!filter) return templates;
  const q = filter.query?.trim().toLowerCase();
  return templates.filter((t) => {
    if (
      filter.category &&
      filter.category !== "all" &&
      t.category !== filter.category
    ) {
      return false;
    }
    if (filter.style && filter.style !== "all" && t.style !== filter.style) {
      return false;
    }
    if (filter.feature && !t.features.includes(filter.feature)) {
      return false;
    }
    if (filter.tag && !t.tags.includes(filter.tag)) {
      return false;
    }
    if (q) {
      const hay = [
        t.id,
        t.slug,
        t.name.en,
        t.name.fa,
        t.description.en,
        t.description.fa,
        t.category,
        t.style,
        ...t.tags,
        ...t.features,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function listCatalogCategories(): TemplateCategory[] {
  return Array.from(new Set(getTemplates().map((t) => t.category)));
}

export function listCatalogStyles(): TemplateStyle[] {
  return Array.from(new Set(getTemplates().map((t) => t.style)));
}
