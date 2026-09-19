export {
  websiteConfigToVisualProject,
  applyVisualProjectToWebsiteConfig,
  assertAdapterPreservesConfig,
  cloneWebsiteConfig,
  visualProjectMatchesSource,
} from "@/lib/visual-editor/adapter";
export {
  buildModernAgencyProject,
  isVisualProjectEmpty,
  MODERN_AGENCY_PAGE_IDS,
} from "@/lib/visual-editor/seed";
export {
  buildProjectFromWebsiteConfig,
  websiteConfigHasRenderableContent,
} from "@/lib/visual-editor/project-from-config";
export {
  syncWebsiteConfigFromVisualProject,
  extractContentPathValues,
  extractSectionMeta,
  extractGalleryImageIds,
  visualProjectFingerprint,
} from "@/lib/visual-editor/sync-from-project";
export { websiteConfigSourceFingerprint } from "@/lib/visual-editor/content-fingerprint";
export { mergeProjectedWithSavedProject } from "@/lib/visual-editor/merge-project";
export {
  visualComponentId,
  VISUAL_PAGE_HOME,
  VISUAL_PAGE_ABOUT,
  isReservedVisualPageId,
} from "@/lib/visual-editor/ids";
export { VISUAL_BLOCKS, VISUAL_SECTIONS } from "@/lib/visual-editor/blocks";
export {
  VISUAL_DEVICES,
  VISUAL_ZOOM_OPTIONS,
  zoomToScale,
  type VisualDeviceId,
  type VisualZoomMode,
} from "@/lib/visual-editor/devices";
export {
  saveWebsiteConfigViaApi,
  createSaveQueue,
  type VisualSaveState,
  type VisualSaveResult,
} from "@/lib/visual-editor/persistence";
export {
  createVisualEditor,
  destroyVisualEditor,
  setVisualDevice,
  setVisualZoom,
  getVisualPages,
  selectVisualPage,
  getActiveVisualPageId,
  serializeVisualProject,
  visualUndo,
  visualRedo,
  canVisualUndo,
  canVisualRedo,
  duplicateSelected,
  deleteSelected,
  toggleSelectedVisibility,
  applyMediaToSelectedImage,
  openAssetManager,
} from "@/lib/visual-editor/controller";
