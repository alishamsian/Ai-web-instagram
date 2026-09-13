import type { WebsiteConfig, SectionConfig } from "@/types/website";

/** Persistent website state is WebsiteConfig — ephemeral UI is separate. */
export type EditorViewportId =
  | "390"
  | "430"
  | "768"
  | "1024"
  | "1280"
  | "1440"
  | "1920"
  | "custom";

export type EditorDevice = "desktop" | "tablet" | "mobile";

export type EditorSavePhase = "idle" | "saving" | "saved" | "error";

export type EditorMode = "editor" | "preview";

export type HistoryEntry = {
  id: string;
  label: string;
  config: WebsiteConfig;
  createdAt: number;
};

export type EditorEphemeralState = {
  selectedSectionId: string | null;
  selectedElementPath: string | null;
  hoveredSectionId: string | null;
  viewport: EditorViewportId;
  customViewportWidth: number;
  mode: EditorMode;
  leftPanel: "pages" | "sections" | "layers";
  commandPaletteOpen: boolean;
  historyPanelOpen: boolean;
  qualityPanelOpen: boolean;
  libraryOpen: boolean;
};

/**
 * Conceptual editor state — WebsiteConfig is the only persistent website source.
 */
export type EditorStateSnapshot = {
  config: WebsiteConfig;
  ephemeral: EditorEphemeralState;
  history: HistoryEntry[];
  historyIndex: number;
  dirty: boolean;
  savePhase: EditorSavePhase;
};

export type SectionMutationKind =
  | "toggle"
  | "delete"
  | "duplicate"
  | "move-up"
  | "move-down"
  | "reorder";

export type ReorderPayload = {
  fromIndex: number;
  toIndex: number;
};

export type EditorCommandResult = {
  config: WebsiteConfig;
  label: string;
  selectedSectionId?: string | null;
};

export function cloneWebsiteConfig(config: WebsiteConfig): WebsiteConfig {
  return structuredClone(config);
}

export function findSection(
  config: WebsiteConfig,
  sectionId: string,
): SectionConfig | undefined {
  return config.sections.find((s) => s.id === sectionId);
}
