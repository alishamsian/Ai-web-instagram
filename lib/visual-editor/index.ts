export {
  websiteConfigToVisualProject,
  applyVisualProjectToWebsiteConfig,
  assertAdapterPreservesConfig,
  cloneWebsiteConfig,
} from "@/lib/visual-editor/adapter";
export {
  buildModernAgencyProject,
  isVisualProjectEmpty,
  MODERN_AGENCY_PAGE_IDS,
} from "@/lib/visual-editor/seed";
export {
  VISUAL_BLOCKS,
  VISUAL_SECTIONS,
} from "@/lib/visual-editor/blocks";
export {
  VISUAL_DEVICES,
  VISUAL_ZOOM_OPTIONS,
  zoomToScale,
  type VisualDeviceId,
  type VisualZoomMode,
} from "@/lib/visual-editor/devices";
export {
  saveWebsiteConfigViaApi,
  type VisualSaveState,
  type VisualSaveResult,
} from "@/lib/visual-editor/persistence";
export {
  createVisualEditor,
  destroyVisualEditor,
  setVisualDevice,
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
} from "@/lib/visual-editor/controller";
