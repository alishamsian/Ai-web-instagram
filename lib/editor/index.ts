export type {
  EditorViewportId,
  EditorDevice,
  EditorSavePhase,
  EditorMode,
  HistoryEntry,
  EditorEphemeralState,
  EditorStateSnapshot,
  EditorCommandResult,
} from "@/lib/editor/types";

export {
  cloneWebsiteConfig,
  findSection,
} from "@/lib/editor/types";

export {
  EDITOR_HISTORY_LIMIT,
  createHistoryEntry,
  pushHistory,
  undoHistory,
  redoHistory,
  restoreHistoryIndex,
} from "@/lib/editor/history";

export {
  commandAddSection,
  commandApplyThemePreset,
  commandApplyTemplate,
  commandDeleteSection,
  commandDuplicateSection,
  commandMoveSection,
  commandReorderSections,
  commandReorderSectionRelative,
  commandSetBrandColor,
  commandSetBrandDesign,
  commandSetBrandTypography,
  commandSetContentPath,
  commandSetSchemaValue,
  commandSetSeoField,
  commandSetSeoKeywords,
  commandToggleSection,
  commandAssignMedia,
  commandSetSectionVariant,
  commandSetContactInfo,
  commandPatchSectionSettings,
  commandSetBrandLogo,
  commandSetBrandColors,
  commandUpdateSiteSettings,
  pinFooterLast,
  readContentPath,
  defaultVariantForType,
} from "@/lib/editor/commands";

export {
  commandAddProduct,
  commandDeleteProduct,
  commandDuplicateProduct,
  commandReorderProduct,
  commandUpdateProduct,
  commandAddService,
  commandUpdateService,
  commandDeleteService,
  commandReorderService,
  commandAddFaqItem,
  commandUpdateFaqItem,
  commandDeleteFaqItem,
  commandDuplicateFaqItem,
  commandReorderFaqItem,
  commandAddTestimonial,
  commandUpdateTestimonial,
  commandDeleteTestimonial,
  commandReorderTestimonial,
  commandEnsureTestimonials,
  commandSetGalleryImages,
  commandToggleGalleryImage,
  commandReorderGalleryImage,
  applyCommandResult,
  type ProductPatch,
} from "@/lib/editor/content-commands";

export {
  createEntityId,
  createLegacyEntityId,
  setEntityIdFactory,
  createSequentialIdFactory,
  type EntityIdFactory,
} from "@/lib/editor/ids";

export {
  normalizeCollectionIdentities,
  normalizeLegacyHeroVariant,
  normalizeEditorConfig,
} from "@/lib/editor/normalize-content";

export {
  normalizeEditorHref,
  resolveEditorHref,
  EDITOR_FIELD_CONTENT_PATH,
} from "@/lib/editor/links";

export {
  applyEditorAction,
  type EditorAction,
  type ApplyEditorActionResult,
} from "@/lib/editor/actions";

export {
  resolveResponsiveValue,
  setResponsiveOverride,
  resetResponsiveOverride,
  resolveResponsiveColumns,
  type ViewportBucket,
} from "@/lib/editor/responsive";

export {
  runPublishPreflight,
  type PublishIssue,
  type PublishPreflightResult,
} from "@/lib/editor/validation";

export {
  scoreWebsiteQuality,
  type WebsiteQualityScore,
  type QualityDeduction,
} from "@/lib/editor/quality";

export {
  proposeEditorActions,
  isProductProtectedAction,
  type MagicDesignDirection,
  type AiCoDesignerRequest,
} from "@/lib/editor/ai";

export {
  resolveEditorKeyCommand,
  type EditorKeyCommand,
} from "@/lib/editor/keyboard";

export {
  buildLayerTreeItems,
  resolveLayerTreeKeyCommand,
  inferSectionTabFromField,
  schemaGroupPriority,
  type LayerTreeItem,
} from "@/lib/editor/layer-tree";

export {
  resolveCanvasDropEdge,
  shouldShowSectionChrome,
  resolveEscapeCascade,
  sectionNeedsScrollIntoView,
  type CanvasDropEdge,
  type EscapeCascadeStep,
} from "@/lib/editor/canvas-interaction";

export {
  loadEditorUiState,
  saveEditorUiState,
  editorFieldToSchemaPath,
  schemaFieldMatchesEditorPath,
  fieldLabelFromPath,
  panelWidthPx,
  normalizeLeftNav,
  matchesInspectorQuery,
  type EditorUiPersisted,
  type EditorSectionTab,
  type EditorSiteGroup,
  type EditorLeftNav,
  type EditorZoomMode,
  type EditorPanelWidth,
} from "@/lib/editor/ui-state";

export {
  EDITOR_VIEWPORT_PRESETS,
  viewportWidth,
  deviceFromViewport,
  viewportFromDevice,
} from "@/lib/editor/viewport";
