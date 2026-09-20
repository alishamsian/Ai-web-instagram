/**
 * Helper to define full-site templates with less boilerplate.
 */

import {
  TEMPLATE_SCHEMA_VERSION,
  type TemplateCategory,
  type TemplateFeature,
  type TemplateNavItem,
  type TemplatePageDef,
  type TemplateStyle,
  type WebsiteTemplate,
} from "@/lib/templates/types";
import type { TemplateBrandPreset } from "@/lib/templates/types";
import type { TemplateType } from "@/types/website";

export function defineTemplate(input: {
  id: string;
  slug: string;
  name: { fa: string; en: string };
  description: { fa: string; en: string };
  category: TemplateCategory;
  style: TemplateStyle;
  tags: string[];
  features: TemplateFeature[];
  legacyTemplate: TemplateType;
  brand: TemplateBrandPreset;
  pages: TemplatePageDef[];
  navigation?: TemplateNavItem[];
  metadata?: WebsiteTemplate["metadata"];
  thumbnail?: string;
}): WebsiteTemplate {
  const navigation =
    input.navigation ??
    input.pages.map((p) => ({
      pageId: p.id,
      label: p.name,
    }));
  return {
    schemaVersion: TEMPLATE_SCHEMA_VERSION,
    ...input,
    navigation,
    thumbnail:
      input.thumbnail ??
      `https://picsum.photos/seed/vitrin-tpl-${input.slug}/960/640`,
  };
}

export function page(
  id: string,
  slug: string,
  name: { fa: string; en: string },
  kind: TemplatePageDef["kind"],
  sections: TemplatePageDef["sections"],
): TemplatePageDef {
  return { id, slug, name, kind, sections };
}

export function sec(
  key: string,
  blockId: string,
  opts?: {
    variant?: string;
    content?: Record<string, string>;
    canonical?: boolean;
  },
): TemplatePageDef["sections"][number] {
  return {
    key,
    blockId,
    variant: opts?.variant,
    content: opts?.content,
    canonical: opts?.canonical,
  };
}
