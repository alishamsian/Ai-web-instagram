/**
 * WebsiteConfig binding helpers for the Puck editor.
 * Mutations go through existing editor commands — no parallel business logic.
 */

import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type { ElementFieldSchema } from "@/lib/store/registry/element-schema";
import type { EditorCommandResult } from "@/lib/editor";
import {
  commandSetSchemaValue,
  commandSetContentPath,
  commandSetBrandColor,
  commandSetSeoField,
  commandSetSectionVariant,
  commandToggleSection,
  commandPatchSectionSettings,
  commandUpdateSiteSettings,
  applyCommandResult,
} from "@/lib/editor";
import { websiteConfigToPuck } from "@/lib/puck/adapter";
import type { PuckWebsiteData } from "@/lib/puck/types";

export type ConfigUpdater = (next: WebsiteConfig) => void;

/** Apply a command result to the updater if the command succeeded. */
export function applyBoundCommand(
  result: EditorCommandResult | null,
  onChange: ConfigUpdater,
): boolean {
  if (!result) return false;
  applyCommandResult(result, onChange);
  return true;
}

export function bindSetSchemaField(params: {
  config: WebsiteConfig;
  sectionId: string;
  field: ElementFieldSchema;
  value: unknown;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandSetSchemaValue({
      config: params.config,
      sectionId: params.sectionId,
      field: params.field,
      value: params.value,
    }),
    params.onChange,
  );
}

export function bindSetContentPath(params: {
  config: WebsiteConfig;
  path: string;
  value: string;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandSetContentPath(params.config, params.path, params.value),
    params.onChange,
  );
}

export function bindSetBrandColor(params: {
  config: WebsiteConfig;
  key: keyof WebsiteConfig["brand"]["colors"];
  value: string;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandSetBrandColor(params.config, params.key, params.value),
    params.onChange,
  );
}

export function bindSetSeoField(params: {
  config: WebsiteConfig;
  field: "title" | "description";
  value: string;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandSetSeoField(params.config, params.field, params.value),
    params.onChange,
  );
}

export function bindSetSectionVariant(params: {
  config: WebsiteConfig;
  sectionId: string;
  variantId: string;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandSetSectionVariant(
      params.config,
      params.sectionId,
      params.variantId,
    ),
    params.onChange,
  );
}

export function bindToggleSectionVisibility(params: {
  config: WebsiteConfig;
  sectionId: string;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandToggleSection(params.config, params.sectionId),
    params.onChange,
  );
}

export function bindPatchSectionSettings(params: {
  config: WebsiteConfig;
  sectionId: string;
  patch: Record<string, unknown>;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandPatchSectionSettings(
      params.config,
      params.sectionId,
      params.patch,
    ),
    params.onChange,
  );
}

export function bindUpdateSiteSettings(params: {
  config: WebsiteConfig;
  patch: Partial<WebsiteConfig["settings"]>;
  onChange: ConfigUpdater;
}): boolean {
  return applyBoundCommand(
    commandUpdateSiteSettings(params.config, params.patch),
    params.onChange,
  );
}

/**
 * After WebsiteConfig-first edits, rebuild Puck projection for structural sync.
 * Content-only edits can skip remount; callers decide.
 */
export function syncPuckDataFromConfig(
  config: WebsiteConfig,
): PuckWebsiteData {
  return websiteConfigToPuck(config);
}

export function findSection(
  config: WebsiteConfig,
  sectionId: string | null | undefined,
): SectionConfig | null {
  if (!sectionId) return null;
  return config.sections.find((s) => s.id === sectionId) ?? null;
}

/** Safe labels for layers — never expose raw ids as primary UI names. */
export function humanSectionLabel(
  section: SectionConfig,
  locale: "fa" | "en",
  registryLabel?: { fa: string; en: string } | null,
): string {
  if (registryLabel) return registryLabel[locale] || registryLabel.en;
  const type = section.type.replace(/-/g, " ");
  return type.charAt(0).toUpperCase() + type.slice(1);
}
