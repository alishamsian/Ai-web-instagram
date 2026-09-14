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
  commandToggleSection,
  pinFooterLast,
  readContentPath,
} from "@/lib/editor/commands";

export {
  applyEditorAction,
  type EditorAction,
  type ApplyEditorActionResult,
} from "@/lib/editor/actions";

export {
  resolveResponsiveValue,
  setResponsiveOverride,
  resetResponsiveOverride,
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
