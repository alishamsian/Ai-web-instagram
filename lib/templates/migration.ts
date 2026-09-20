/**
 * Template schema migration foundation (Phase 3.0).
 * Keep minimal — establish the architecture only.
 */

import {
  TEMPLATE_SCHEMA_VERSION,
  type WebsiteTemplate,
} from "@/lib/templates/types";

/**
 * Migrate a template definition to the current schema version.
 * Unknown future versions throw; v1 is currently the only version.
 */
export function migrateTemplate(
  template: WebsiteTemplate,
): WebsiteTemplate {
  let current = { ...template };
  if (current.schemaVersion > TEMPLATE_SCHEMA_VERSION) {
    throw new Error(
      `Cannot migrate template ${current.id}: schemaVersion ${current.schemaVersion} is newer than supported ${TEMPLATE_SCHEMA_VERSION}`,
    );
  }
  // Future: while (current.schemaVersion < TEMPLATE_SCHEMA_VERSION) { ... }
  if (current.schemaVersion < 1) {
    current = { ...current, schemaVersion: 1 };
  }
  return current;
}

export function currentTemplateSchemaVersion(): number {
  return TEMPLATE_SCHEMA_VERSION;
}
