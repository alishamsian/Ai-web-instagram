import type { EditorViewportId } from "@/lib/editor/types";
import type { EditorFieldPath } from "@/components/editor/EditContext";

export type EditorSectionTab = "content" | "layout" | "style";
export type EditorSiteGroup = "style" | "content" | "site";
/** Left sidebar destinations — Views are section shortcuts, not multi-page CRUD. */
export type EditorLeftNav =
  | "views"
  | "layers"
  | "insert"
  | "assets"
  | "site"
  /** @deprecated prefer views */
  | "pages"
  /** @deprecated prefer layers */
  | "sections";

export type EditorZoomMode = "fit" | "75" | "100";
export type EditorPanelWidth = "narrow" | "normal" | "wide";

export type EditorUiPersisted = {
  viewport?: EditorViewportId;
  selectedSectionId?: string | null;
  focusMode?: boolean;
  leftNav?: EditorLeftNav;
  sectionTab?: EditorSectionTab;
  siteGroup?: EditorSiteGroup;
  zoom?: EditorZoomMode;
  panelWidth?: EditorPanelWidth;
  inspectorLight?: boolean;
  splitPreview?: boolean;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
};

const PREFIX = "vitrin-editor-ui:";

const LEFT_NAV_ALIASES: Record<string, EditorLeftNav> = {
  views: "views",
  layers: "layers",
  insert: "insert",
  assets: "assets",
  site: "site",
  pages: "views",
  sections: "layers",
};

export function normalizeLeftNav(value: unknown): EditorLeftNav {
  if (typeof value !== "string") return "layers";
  return LEFT_NAV_ALIASES[value] ?? "layers";
}

export function editorUiStorageKey(websiteId: string) {
  return `${PREFIX}${websiteId}`;
}

export function loadEditorUiState(websiteId: string): EditorUiPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(editorUiStorageKey(websiteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorUiPersisted;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.leftNav) parsed.leftNav = normalizeLeftNav(parsed.leftNav);
    return parsed;
  } catch {
    return null;
  }
}

export function saveEditorUiState(
  websiteId: string,
  state: EditorUiPersisted,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      editorUiStorageKey(websiteId),
      JSON.stringify(state),
    );
  } catch {
    // quota / private mode — ignore
  }
}

export function panelWidthPx(
  side: "left" | "right",
  width: EditorPanelWidth,
): number {
  // Left includes ~44px icon rail.
  if (side === "left") {
    if (width === "narrow") return 268;
    if (width === "wide") return 360;
    return 312;
  }
  if (width === "narrow") return 300;
  if (width === "wide") return 380;
  return 336;
}

/** Map canvas EditorFieldPath → schema path like content.hero.headline */
export function editorFieldToSchemaPath(path: EditorFieldPath): string {
  return `content.${path}`;
}

export function schemaFieldMatchesEditorPath(
  schemaPath: string | undefined,
  schemaKey: string | undefined,
  editorPath: EditorFieldPath | undefined,
): boolean {
  if (!editorPath) return false;
  const expected = editorFieldToSchemaPath(editorPath);
  if (schemaPath === expected) return true;
  if (schemaPath?.endsWith(`.${editorPath}`)) return true;
  const leaf = editorPath.split(".").pop();
  if (leaf && schemaKey === leaf && schemaPath?.includes(leaf)) return true;
  return false;
}

export function fieldLabelFromPath(
  path: EditorFieldPath | undefined,
  blocks: { field?: EditorFieldPath; label: { fa: string; en: string } }[],
  locale: "fa" | "en",
): string | undefined {
  if (!path) return undefined;
  return blocks.find((b) => b.field === path)?.label[locale];
}

/** Property search across schema field labels/keys/groups. */
export function matchesInspectorQuery(
  query: string,
  haystacks: Array<string | undefined | null>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => Boolean(h && h.toLowerCase().includes(q)));
}
