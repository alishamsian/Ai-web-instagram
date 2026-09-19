/**
 * WebsiteConfig ↔ GrapesJS project adapter (Phase 2).
 *
 * Rules:
 * - WebsiteConfig is canonical; GrapesJS is an editing projection
 * - Real WebsiteConfig always wins over demo seed
 * - Seed only when site has no renderable content AND no saved visual project
 * - Round-trip never silently drops brand/content/sections/seo/settings/media
 * - Classic drift is detected via sourceFingerprint; reserved pages rebuild, extras keep
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
import { websiteConfigSourceFingerprint } from "@/lib/visual-editor/content-fingerprint";
import { mergeProjectedWithSavedProject } from "@/lib/visual-editor/merge-project";

export function cloneWebsiteConfig<T extends WebsiteConfig>(config: T): T {
  return structuredClone(config);
}

/**
 * Whether the saved visual project still matches live WebsiteConfig projection inputs.
 * Missing fingerprint (v1) → treat as matching (preserve layout until next visual save).
 */
export function visualProjectMatchesSource(config: WebsiteConfig): boolean {
  const saved = config.visualEditor?.sourceFingerprint;
  if (!saved) return true;
  return saved === websiteConfigSourceFingerprint(config);
}

/**
 * Resolve GrapesJS project for the editor.
 * Priority:
 * 1) Existing saved visualEditor.project (when fingerprint matches / missing)
 * 2) Merge: rebuild reserved pages from WebsiteConfig + keep extra GrapesJS pages
 * 3) Fresh projection from WebsiteConfig
 * 4) Dev seed only for empty sites
 */
export function websiteConfigToVisualProject(
  config: WebsiteConfig,
): ProjectData {
  const existing = config.visualEditor?.project;
  const hasSaved = !isVisualProjectEmpty(existing);

  if (hasSaved && visualProjectMatchesSource(config)) {
    return existing as ProjectData;
  }

  if (websiteConfigHasRenderableContent(config)) {
    const projected = buildProjectFromWebsiteConfig(config);
    if (hasSaved) {
      return mergeProjectedWithSavedProject(projected, existing!);
    }
    return projected;
  }

  if (hasSaved) {
    // Empty content but layout exists — keep layout (user may clear content later)
    return existing as ProjectData;
  }

  return buildModernAgencyProject(config);
}

/**
 * Merge GrapesJS project back into WebsiteConfig (lossless + content sync).
 * Persists adapter version 2 + sourceFingerprint for Classic drift detection.
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
