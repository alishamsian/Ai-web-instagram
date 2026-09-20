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
  extractPageContentPathValues,
  extractCanonicalContentPathValues,
  extractSectionMeta,
  extractPageSectionMeta,
  extractGalleryImageIds,
  extractGalleryImageIdsFromPage,
  extractCollectionOrder,
  collectPagesWithRoots,
  visualProjectFingerprint,
} from "@/lib/visual-editor/sync-from-project";
export { websiteConfigSourceFingerprint } from "@/lib/visual-editor/content-fingerprint";
export { mergeProjectedWithSavedProject } from "@/lib/visual-editor/merge-project";
export {
  visualComponentId,
  stableCollectionItemId,
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
  clearVisualUndoHistory,
  createVisualPage,
  renameVisualPage,
  deleteVisualPage,
  duplicateVisualPage,
  reorderVisualPages,
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
export {
  normalizePageSlug,
  validateNewPageInput,
  ensureWebsitePages,
  syncPagesMetaFromProject,
  ensureDefaultPages,
  addPageMeta,
  renamePageMeta,
  removePageMeta,
  reorderPageMeta,
  reorderProjectPages,
  removeProjectPage,
  renameProjectPage,
  duplicateProjectPage,
  addBlankProjectPage,
  blankPageComponent,
  grapesComponentToHtml,
  uniqueCopySlug,
  uniqueCopyName,
  pageIdFromSlug,
  resolvePageHref,
  extractProjectPageHtml,
  findPageByIdOrSlug,
  hrefForPageSlug,
  PageOpError,
  type PageOpErrorCode,
} from "@/lib/visual-editor/pages";
export {
  getVisualRegistry,
  getVisualBlock,
  listVisualBlocks,
  createBlockHtml,
  registryAsGrapesBlocks,
  nextSectionId,
  defaultVariantId,
  resolveVariantId,
  HERO_VARIANTS,
  CTA_VARIANTS,
  TESTIMONIAL_VARIANTS,
} from "@/lib/visual-editor/registry";
export {
  insertVisualBlock,
  applySectionVariant,
  type InsertVisualBlockResult,
} from "@/lib/visual-editor/insert";
export {
  resolveVisualDesignTokens,
  visualDesignTokenCssVars,
  visualDesignTokenStyleTag,
  type VisualDesignTokens,
} from "@/lib/visual-editor/design-tokens";
export {
  getComponentStyle,
  setComponentStyle,
  setComponentStyles,
  relevantInspectorGroups,
  type InspectorGroup,
} from "@/lib/visual-editor/inspector-model";

