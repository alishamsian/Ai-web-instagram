/**
 * Thin adapter: Element Schema → legacy-friendly field list for future Inspector.
 * Not a second source of truth — reads from Registry schema only.
 */
import type { ElementFieldSchema, ElementSchema } from "@/lib/store/registry/element-schema";
import { flattenElementFields } from "@/lib/store/registry/element-schema";
import { getSectionSchema } from "@/lib/store/registry/catalog";
import type { RegistrySectionType } from "@/lib/store/registry/types";

export type LegacyInspectorField = {
  key: string;
  kind: string;
  path?: string;
  label?: { fa: string; en: string };
  group?: string;
  options?: { value: string; label: { fa: string; en: string } }[];
  token?: string;
  responsive?: boolean;
};

export function schemaToLegacyInspectorFields(
  schema: ElementSchema | undefined,
): LegacyInspectorField[] {
  if (!schema) return [];
  return flattenElementFields(schema)
    .filter((field) => !field.hidden)
    .map((field: ElementFieldSchema) => ({
      key: field.key,
      kind: field.kind,
      path: field.path,
      label: field.label,
      group: field.group,
      options: field.options,
      token: field.token,
      responsive: field.responsive,
    }));
}

export function getLegacyInspectorFieldsForSection(
  type: RegistrySectionType,
): LegacyInspectorField[] {
  return schemaToLegacyInspectorFields(getSectionSchema(type));
}
