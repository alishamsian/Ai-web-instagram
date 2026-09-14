import type { EditorViewportId } from "@/lib/editor/types";
import type { EditorFieldPath } from "@/components/editor/EditContext";

export type EditorSectionTab = "content" | "layout" | "style";
export type EditorSiteGroup = "style" | "content" | "site";
export type EditorLeftNav = "pages" | "sections" | "layers";

export type EditorUiPersisted = {
  viewport?: EditorViewportId;
  selectedSectionId?: string | null;
  focusMode?: boolean;
  leftNav?: EditorLeftNav;
  sectionTab?: EditorSectionTab;
  siteGroup?: EditorSiteGroup;
};

const PREFIX = "vitrin-editor-ui:";

export function editorUiStorageKey(websiteId: string) {
  return `${PREFIX}${websiteId}`;
}

export function loadEditorUiState(websiteId: string): EditorUiPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(editorUiStorageKey(websiteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorUiPersisted;
    return parsed && typeof parsed === "object" ? parsed : null;
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
