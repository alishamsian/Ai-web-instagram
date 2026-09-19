/**
 * WebsiteConfig ↔ GrapesJS project adapter (Phase 1.1 hardened).
 *
 * Rules:
 * - Real WebsiteConfig always wins over demo seed
 * - Seed only when site has no renderable content AND no saved visual project
 * - Round-trip never silently drops brand/content/sections/seo/settings/media
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig, VisualEditorState } from "@/types/website";
import {
  buildModernAgencyProject,
  isVisualProjectEmpty,
} from "@/lib/visual-editor/seed";
import {
  buildProjectFromWebsiteConfig,
  websiteConfigHasRenderableContent,
} from "@/lib/visual-editor/project-from-config";
import { syncWebsiteConfigFromVisualProject } from "@/lib/visual-editor/sync-from-project";

export function cloneWebsiteConfig<T extends WebsiteConfig>(config: T): T {
  return structuredClone(config);
}

/**
 * Resolve GrapesJS project for the editor.
 * Priority:
 * 1) Existing saved visualEditor.project
 * 2) Projection from real WebsiteConfig sections/content
 * 3) Dev seed only for empty sites
 */
export function websiteConfigToVisualProject(
  config: WebsiteConfig,
): ProjectData {
  const existing = config.visualEditor?.project;
  if (!isVisualProjectEmpty(existing)) {
    return existing as ProjectData;
  }
  if (websiteConfigHasRenderableContent(config)) {
    return buildProjectFromWebsiteConfig(config);
  }
  // Empty development site only
  return buildModernAgencyProject(config);
}

/**
 * Merge GrapesJS project back into WebsiteConfig (lossless + content sync).
 */
export function applyVisualProjectToWebsiteConfig(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
  options?: { activePageId?: string },
): WebsiteConfig {
  const next = syncWebsiteConfigFromVisualProject(config, project, options);
  if (!next.brand.name?.trim()) {
    next.brand.name = "Untitled site";
  }
  return next;
}

/** Assert unknown / unrelated fields survive adapter round-trip. */
export function assertAdapterPreservesConfig(
  original: WebsiteConfig,
  restored: WebsiteConfig,
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  if (original.template !== restored.template) {
    messages.push("template changed");
  }
  if (JSON.stringify(original.brand) !== JSON.stringify(restored.brand)) {
    const o = { ...original.brand };
    const r = { ...restored.brand };
    if (o.name?.trim()) {
      if (JSON.stringify(o) !== JSON.stringify(r)) {
        messages.push("brand changed");
      }
    }
  }
  // content may be intentionally synced from canvas — only flag structural loss of keys
  for (const key of Object.keys(original.content) as Array<
    keyof WebsiteConfig["content"]
  >) {
    if (original.content[key] != null && restored.content[key] == null) {
      messages.push(`content.${String(key)} dropped`);
    }
  }
  const originalIds = original.sections.map((s) => s.id).sort();
  const restoredIds = restored.sections.map((s) => s.id).sort();
  if (JSON.stringify(originalIds) !== JSON.stringify(restoredIds)) {
    messages.push("section ids changed/dropped");
  }
  if (JSON.stringify(original.seo) !== JSON.stringify(restored.seo)) {
    messages.push("seo changed");
  }
  if (
    JSON.stringify(original.settings) !== JSON.stringify(restored.settings)
  ) {
    messages.push("settings changed");
  }
  if (JSON.stringify(original.media) !== JSON.stringify(restored.media)) {
    messages.push("media changed");
  }
  for (const key of Object.keys(original)) {
    if (
      key === "visualEditor" ||
      key === "content" ||
      [
        "template",
        "brand",
        "sections",
        "seo",
        "settings",
        "media",
      ].includes(key)
    ) {
      continue;
    }
    const origBag = original as unknown as Record<string, unknown>;
    const restBag = restored as unknown as Record<string, unknown>;
    if (JSON.stringify(origBag[key]) !== JSON.stringify(restBag[key])) {
      messages.push(`extra field "${key}" changed`);
    }
  }
  return { ok: messages.length === 0, messages };
}

export type { VisualEditorState };
