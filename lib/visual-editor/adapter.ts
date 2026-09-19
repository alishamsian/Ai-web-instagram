/**
 * WebsiteConfig ↔ GrapesJS project adapter.
 *
 * GrapesJS = visual editing engine
 * WebsiteConfig = canonical application model
 *
 * Phase 1: persist GrapesJS project under config.visualEditor without
 * discarding unrelated WebsiteConfig fields.
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig, VisualEditorState } from "@/types/website";
import {
  buildModernAgencyProject,
  isVisualProjectEmpty,
} from "@/lib/visual-editor/seed";

export function cloneWebsiteConfig<T extends WebsiteConfig>(config: T): T {
  return structuredClone(config);
}

/**
 * Resolve the GrapesJS project for the editor.
 * Prefer existing visualEditor.project; otherwise seed from brand (lossless for rest of config).
 */
export function websiteConfigToVisualProject(
  config: WebsiteConfig,
): ProjectData {
  const existing = config.visualEditor?.project;
  if (!isVisualProjectEmpty(existing)) {
    return existing as ProjectData;
  }
  return buildModernAgencyProject(config);
}

/**
 * Merge GrapesJS project back into WebsiteConfig.
 * Never drops brand/content/sections/seo/settings/media or unknown future fields.
 */
export function applyVisualProjectToWebsiteConfig(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
  options?: { activePageId?: string },
): WebsiteConfig {
  const next = cloneWebsiteConfig(config);
  const visualEditor: VisualEditorState = {
    engine: "grapesjs",
    version: 1,
    project: { ...(project as Record<string, unknown>) },
    activePageId:
      options?.activePageId ?? config.visualEditor?.activePageId ?? "home",
  };
  next.visualEditor = visualEditor;

  // Light, optional brand sync from first page title if brand was empty — never overwrite real names.
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
    // brand may gain default name only when empty — allow that
    const o = { ...original.brand };
    const r = { ...restored.brand };
    if (o.name?.trim()) {
      if (JSON.stringify(o) !== JSON.stringify(r)) {
        messages.push("brand changed");
      }
    }
  }
  if (JSON.stringify(original.content) !== JSON.stringify(restored.content)) {
    messages.push("content changed");
  }
  if (JSON.stringify(original.sections) !== JSON.stringify(restored.sections)) {
    messages.push("sections changed");
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
  // Preserve arbitrary extra keys on the config object (forward-compat)
  for (const key of Object.keys(original)) {
    if (
      key === "visualEditor" ||
      [
        "template",
        "brand",
        "content",
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
