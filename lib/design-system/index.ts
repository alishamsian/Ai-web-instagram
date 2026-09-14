/**
 * Architecture-level Design System for Store / future Vertical Packs.
 *
 * Layers:
 * 1. primitives — raw values
 * 2. semantic / tokens — meaning-based roles
 * 3. theme — light/dark/system + mood chrome
 * 4. brand / visual presets — overlays
 * 5. component contracts — Registry-ready vocabulary
 *
 * Runtime Store still uses `--store-*` CSS vars via `storeCssVars`.
 * Future sections should prefer `--site-*` via `siteCssVars`.
 * Editor chrome (`--ed-*`) is a separate system.
 */

export * from "@/lib/design-system/primitives";
export * from "@/lib/design-system/semantic";
export * from "@/lib/design-system/typography";
export * from "@/lib/design-system/spacing";
export * from "@/lib/design-system/layout";
export * from "@/lib/design-system/foundation";
export * from "@/lib/design-system/components";
export * from "@/lib/design-system/themes";
export * from "@/lib/design-system/tokens";
export {
  resolveDesignTokens,
  REQUIRED_COLOR_KEYS,
  type ResolveDesignOptions,
} from "@/lib/design-system/resolve-design";
export {
  storeCssVars,
  siteCssVars,
  websiteCssVars,
  assertNoEditorTokenLeakage,
  isWebsiteTokenName,
} from "@/lib/design-system/css-vars";
export {
  VISUAL_PRESETS,
  getVisualPreset,
  applyVisualPreset,
  validateVisualPresetCatalog,
  isVisualPresetDistinct,
  type VisualPreset,
  type VisualPresetId,
  type VisualPresetDesignHints,
} from "@/lib/design-system/visual-presets";
