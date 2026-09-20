/**
 * Template validation — invalid templates must fail registration clearly.
 */

import { getVisualBlock } from "@/lib/visual-editor/registry";
import {
  isTemplateCategory,
  isTemplateStyle,
} from "@/lib/templates/categories";
import {
  TEMPLATE_SCHEMA_VERSION,
  type WebsiteTemplate,
} from "@/lib/templates/types";

export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateValidationError";
  }
}

export function validateTemplate(template: WebsiteTemplate): void {
  if (!template.id?.trim()) {
    throw new TemplateValidationError("Template id is required");
  }
  if (!template.slug?.trim()) {
    throw new TemplateValidationError(`Template ${template.id}: slug required`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(template.slug)) {
    throw new TemplateValidationError(
      `Template ${template.id}: invalid slug "${template.slug}"`,
    );
  }
  if (!isTemplateCategory(template.category)) {
    throw new TemplateValidationError(
      `Template ${template.id}: invalid category "${template.category}"`,
    );
  }
  if (!isTemplateStyle(template.style)) {
    throw new TemplateValidationError(
      `Template ${template.id}: invalid style "${template.style}"`,
    );
  }
  if (
    typeof template.schemaVersion !== "number" ||
    template.schemaVersion < 1
  ) {
    throw new TemplateValidationError(
      `Template ${template.id}: invalid schemaVersion`,
    );
  }
  if (template.schemaVersion > TEMPLATE_SCHEMA_VERSION) {
    throw new TemplateValidationError(
      `Template ${template.id}: unsupported schemaVersion ${template.schemaVersion}`,
    );
  }
  if (!template.pages?.length) {
    throw new TemplateValidationError(
      `Template ${template.id}: at least one page required`,
    );
  }

  const pageIds = new Set<string>();
  const pageSlugs = new Set<string>();
  let hasHome = false;

  for (const page of template.pages) {
    if (!page.id?.trim()) {
      throw new TemplateValidationError(
        `Template ${template.id}: page id required`,
      );
    }
    if (pageIds.has(page.id)) {
      throw new TemplateValidationError(
        `Template ${template.id}: duplicate page id "${page.id}"`,
      );
    }
    pageIds.add(page.id);

    const slug = page.slug.trim();
    if (page.kind === "home") {
      hasHome = true;
      if (slug !== "" && slug !== "home") {
        throw new TemplateValidationError(
          `Template ${template.id}: home page slug must be empty or "home"`,
        );
      }
    } else if (!slug) {
      throw new TemplateValidationError(
        `Template ${template.id}: page "${page.id}" needs a slug`,
      );
    }
    const slugKey = page.kind === "home" ? "" : slug;
    if (pageSlugs.has(slugKey)) {
      throw new TemplateValidationError(
        `Template ${template.id}: duplicate page slug "${slug}"`,
      );
    }
    pageSlugs.add(slugKey);

    if (!page.sections?.length) {
      throw new TemplateValidationError(
        `Template ${template.id}: page "${page.id}" needs sections`,
      );
    }

    const sectionKeys = new Set<string>();
    for (const section of page.sections) {
      if (!section.key?.trim()) {
        throw new TemplateValidationError(
          `Template ${template.id}: section key required on page "${page.id}"`,
        );
      }
      if (sectionKeys.has(section.key)) {
        throw new TemplateValidationError(
          `Template ${template.id}: duplicate section key "${section.key}" on page "${page.id}"`,
        );
      }
      sectionKeys.add(section.key);

      const block = getVisualBlock(section.blockId);
      if (!block) {
        throw new TemplateValidationError(
          `Template ${template.id}: unknown block "${section.blockId}"`,
        );
      }
      if (section.variant && block.variants?.length) {
        const ok = block.variants.some((v) => v.id === section.variant);
        if (!ok) {
          throw new TemplateValidationError(
            `Template ${template.id}: invalid variant "${section.variant}" for "${section.blockId}"`,
          );
        }
      }
    }
  }

  if (!hasHome) {
    throw new TemplateValidationError(
      `Template ${template.id}: home page required`,
    );
  }

  for (const nav of template.navigation ?? []) {
    if (!pageIds.has(nav.pageId)) {
      throw new TemplateValidationError(
        `Template ${template.id}: nav references missing page "${nav.pageId}"`,
      );
    }
  }

  if (!template.brand?.colors?.primary) {
    throw new TemplateValidationError(
      `Template ${template.id}: brand colors required`,
    );
  }
}
