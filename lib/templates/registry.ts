/**
 * Product-owned full-site template registry.
 */

import { ALL_WEBSITE_TEMPLATES } from "@/lib/templates/templates";
import { migrateTemplate } from "@/lib/templates/migration";
import { validateTemplate } from "@/lib/templates/validation";
import type { WebsiteTemplate } from "@/lib/templates/types";

const byId = new Map<string, WebsiteTemplate>();
const bySlug = new Map<string, WebsiteTemplate>();

function registerInternal(template: WebsiteTemplate) {
  const migrated = migrateTemplate(template);
  validateTemplate(migrated);
  if (byId.has(migrated.id)) {
    throw new Error(`Duplicate template id: ${migrated.id}`);
  }
  if (bySlug.has(migrated.slug)) {
    throw new Error(`Duplicate template slug: ${migrated.slug}`);
  }
  byId.set(migrated.id, migrated);
  bySlug.set(migrated.slug, migrated);
}

/** Register a template (throws on validation / duplicate). */
export function registerTemplate(template: WebsiteTemplate): void {
  registerInternal(template);
}

export function getTemplate(id: string): WebsiteTemplate | undefined {
  return byId.get(id);
}

export function getTemplateBySlug(slug: string): WebsiteTemplate | undefined {
  return bySlug.get(slug);
}

export function getTemplates(): WebsiteTemplate[] {
  return Array.from(byId.values());
}

/** Test helper — clears and reloads built-in catalog. */
export function resetTemplateRegistry(
  templates: WebsiteTemplate[] = ALL_WEBSITE_TEMPLATES,
): void {
  byId.clear();
  bySlug.clear();
  for (const t of templates) registerInternal(t);
}

// Boot built-in catalog
resetTemplateRegistry();
