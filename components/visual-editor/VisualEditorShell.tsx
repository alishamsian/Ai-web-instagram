"use client";

/**
 * Visual Editor shell — GrapesJS engine + product chrome (Phase 1.1 hardened).
 * WebsiteConfig remains canonical; GrapesJS project lives under config.visualEditor.
 * Zoom/device are editor UI only and are never persisted.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Editor } from "grapesjs";
import type { WebsiteConfig, WebsitePage, WebsiteRecord } from "@/types/website";
import type { Locale } from "@/lib/config/env";
import {
  applyMediaToSelectedImage,
  applyVisualProjectToWebsiteConfig,
  blankPageComponent,
  canVisualRedo,
  canVisualUndo,
  clearVisualUndoHistory,
  createSaveQueue,
  createVisualEditor,
  createVisualPage,
  deleteSelected,
  deleteVisualPage,
  destroyVisualEditor,
  duplicateSelected,
  duplicateVisualPage,
  ensureWebsitePages,
  getActiveVisualPageId,
  insertVisualBlock,
  openAssetManager,
  pageIdFromSlug,
  PageOpError,
  renameVisualPage,
  reorderPageMeta,
  reorderVisualPages,
  selectVisualPage,
  serializeVisualProject,
  setVisualDevice,
  setVisualZoom,
  toggleSelectedVisibility,
  toggleSelectedLock,
  uniqueCopyName,
  uniqueCopySlug,
  validateNewPageInput,
  visualProjectFingerprint,
  visualRedo,
  visualUndo,
  websiteConfigToVisualProject,
  getVisualBlock,
  applySectionVariant,
  type VisualDeviceId,
  type VisualSaveState,
  type VisualZoomMode,
  VISUAL_DEVICES,
  VISUAL_PAGE_HOME,
  VISUAL_ZOOM_OPTIONS,
} from "@/lib/visual-editor";
import {
  moveComponentRelative,
  resolveCanvasDropHint,
  type CanvasDropHint,
} from "@/lib/visual-editor/dnd/reorder";
import { getActiveLibraryDrag } from "@/lib/visual-editor/dnd/drag-state";
import {
  dropPositionLabel,
  formatComponentLabel,
  withPageBreadcrumbRoot,
} from "@/lib/visual-editor/ux-labels";
import {
  canApplyShortcutAction,
  isTypingTarget,
  resolveBuilderShortcut,
} from "@/lib/visual-editor/ux-keyboard";
import { VisualEditorLoading } from "@/components/visual-editor/VisualEditorLoading";
import { VisualPagesPanel } from "@/components/visual-editor/VisualPagesPanel";
import { VisualBlockLibrary } from "@/components/visual-editor/VisualBlockLibrary";
import { VisualInspectorPanel } from "@/components/visual-editor/VisualInspectorPanel";
import { VisualNavigator } from "@/components/visual-editor/VisualNavigator";
import "@/app/visual-editor.css";
import "grapesjs/dist/css/grapes.min.css";
import {
  AlignCenter,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  Copy,
  EyeOff,
  ImageIcon,
  Italic,
  Link2,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

type LeftTab = "pages" | "library" | "assets" | "navigator";
type RightTab = "inspector" | "style";

const AUTOSAVE_MS = 1200;

export function VisualEditorShell({
  website,
  locale,
  initialPage = null,
}: {
  website: WebsiteRecord;
  locale: Locale;
  /** Stable page id/slug from URL `?page=` (server-resolved; avoids useSearchParams hydration). */
  initialPage?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isFa = locale === "fa";
  const canvasRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const initialConfig = structuredClone(website.config);
  initialConfig.pages = ensureWebsitePages(initialConfig);
  const configRef = useRef<WebsiteConfig>(initialConfig);
  const versionRef = useRef(website.version);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedFingerprint = useRef("");
  const saveQueueRef = useRef<ReturnType<typeof createSaveQueue> | null>(null);
  /** Guards React Strict Mode / remount races so a late destroy cannot wipe a newer editor. */
  const editorMountIdRef = useRef(0);
  const refreshDirtyRef = useRef<() => void>(() => {});
  const syncHistoryRef = useRef<() => void>(() => {});
  const switchingPageRef = useRef(false);

  const initialPageFromUrlRef = useRef(initialPage);
  /** Defer full chrome until after hydration — GrapesJS hosts are client-only. */
  const [shellHydrated, setShellHydrated] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<VisualSaveState>("clean");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [device, setDevice] = useState<VisualDeviceId>("desktop");
  const [zoom, setZoom] = useState<VisualZoomMode>(100);
  const [leftTab, setLeftTab] = useState<LeftTab>(
    initialPage ? "pages" : "library",
  );
  const [rightTab, setRightTab] = useState<RightTab>("inspector");
  const [selectedIsText, setSelectedIsText] = useState(false);
  const [pageMeta, setPageMeta] = useState<WebsitePage[]>(
    initialConfig.pages ?? [],
  );
  const [activePageId, setActivePageId] = useState(
    initialPage ||
      website.config.visualEditor?.activePageId ||
      VISUAL_PAGE_HOME,
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedIsImage, setSelectedIsImage] = useState(false);
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [mediaMap, setMediaMap] = useState(website.config.media);
  const [dropHint, setDropHint] = useState<CanvasDropHint | null>(null);
  const [selectionCrumbs, setSelectionCrumbs] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [selectedIsSection, setSelectedIsSection] = useState(false);
  const [sectionVariants, setSectionVariants] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [hoverBadge, setHoverBadge] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [canvasEmpty, setCanvasEmpty] = useState(false);
  const siteName = website.config.brand.name || website.slug || "Website";

  const mediaList = useMemo(
    () =>
      Object.entries(mediaMap).map(([id, media]) => ({
        id,
        url: media.url,
        alt: media.alt,
        type: media.type,
      })),
    [mediaMap],
  );

  const syncHistoryFlags = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    setCanUndo(canVisualUndo(ed));
    setCanRedo(canVisualRedo(ed));
  }, []);

  const refreshDirtyFromEditor = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (switchingPageRef.current) {
      syncHistoryFlags();
      return;
    }
    const project = serializeVisualProject(ed);
    const fingerprint = visualProjectFingerprint(project);
    const dirty = fingerprint !== lastSavedFingerprint.current;
    setSaveState((prev) => {
      if (prev === "saving" || prev === "conflict") return prev;
      if (dirty) return "dirty";
      if (prev === "saved") return prev;
      return "clean";
    });
    syncHistoryFlags();
    const pid = getActiveVisualPageId(ed);
    if (pid) setActivePageId(pid);
    if (configRef.current.pages) setPageMeta(configRef.current.pages);
  }, [syncHistoryFlags]);

  const pullConfigFromEditor = useCallback((): WebsiteConfig => {
    const ed = editorRef.current;
    if (!ed) return configRef.current;
    const project = serializeVisualProject(ed);
    const pageId = getActiveVisualPageId(ed);
    const next = applyVisualProjectToWebsiteConfig(configRef.current, project, {
      activePageId: pageId,
    });
    configRef.current = next;
    setPageMeta(next.pages ?? []);
    return next;
  }, []);

  const writePageToUrl = useCallback(
    (pageId: string) => {
      const qs =
        pageId === VISUAL_PAGE_HOME
          ? ""
          : `?page=${encodeURIComponent(pageId)}`;
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [pathname, router],
  );

  const switchToPage = useCallback(
    (pageId: string) => {
      const ed = editorRef.current;
      if (!ed) return;
      if (getActiveVisualPageId(ed) === pageId) {
        setActivePageId(pageId);
        writePageToUrl(pageId);
        return;
      }
      switchingPageRef.current = true;
      const beforeFp = visualProjectFingerprint(serializeVisualProject(ed));
      const wasDirty = beforeFp !== lastSavedFingerprint.current;
      pullConfigFromEditor();
      selectVisualPage(ed, pageId);
      clearVisualUndoHistory(ed);
      setActivePageId(pageId);
      writePageToUrl(pageId);
      syncHistoryFlags();
      if (!wasDirty) {
        lastSavedFingerprint.current = visualProjectFingerprint(
          serializeVisualProject(ed),
        );
        setSaveState((prev) =>
          prev === "saving" || prev === "conflict" ? prev : "clean",
        );
      } else {
        setSaveState((prev) =>
          prev === "saving" || prev === "conflict" ? prev : "dirty",
        );
      }
      switchingPageRef.current = false;
      if (configRef.current.pages) setPageMeta(configRef.current.pages);
    },
    [pullConfigFromEditor, syncHistoryFlags, writePageToUrl],
  );
  const handleCreatePage = useCallback(
    async (input: { name: string; slug: string }) => {
      const ed = editorRef.current;
      if (!ed) return;
      setPageError(null);
      try {
        pullConfigFromEditor();
        const pages = ensureWebsitePages(configRef.current);
        const validated = validateNewPageInput(input.name, input.slug, pages);
        const dir =
          configRef.current.settings.direction === "rtl" ? "rtl" : "ltr";
        const lang =
          configRef.current.settings.language === "en" ? "en" : "fa";
        createVisualPage(ed, {
          id: validated.id,
          name: validated.name,
          slug: validated.slug,
          componentHtml: blankPageComponent({
            id: validated.id,
            name: validated.name,
            slug: validated.slug,
            dir,
            lang,
          }),
        });
        clearVisualUndoHistory(ed);
        const next = pullConfigFromEditor();
        setPageMeta(next.pages ?? []);
        setActivePageId(validated.id);
        writePageToUrl(validated.id);
        setSaveState("dirty");
      } catch (err) {
        setPageError(
          err instanceof PageOpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to create page",
        );
      }
    },
    [pullConfigFromEditor, writePageToUrl],
  );

  const handleRenamePage = useCallback(
    async (pageId: string, patch: { name: string; slug?: string }) => {
      const ed = editorRef.current;
      if (!ed) return;
      setPageError(null);
      try {
        pullConfigFromEditor();
        renameVisualPage(ed, pageId, patch);
        const next = pullConfigFromEditor();
        // Ensure slug/name land in pages meta
        if (next.pages) {
          next.pages = next.pages.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  name: patch.name.trim() || p.name,
                  slug:
                    p.kind === "custom" && patch.slug !== undefined
                      ? patch.slug
                      : p.slug,
                }
              : p,
          );
          configRef.current = next;
          setPageMeta(next.pages);
        }
        setSaveState("dirty");
      } catch (err) {
        setPageError(
          err instanceof PageOpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to rename page",
        );
      }
    },
    [pullConfigFromEditor],
  );

  const handleDuplicatePage = useCallback(
    async (pageId: string) => {
      const ed = editorRef.current;
      if (!ed) return;
      setPageError(null);
      try {
        pullConfigFromEditor();
        const pages = ensureWebsitePages(configRef.current);
        const source = pages.find((p) => p.id === pageId);
        if (!source) throw new PageOpError("PAGE_NOT_FOUND", "Page not found");
        const slug = uniqueCopySlug(
          source.slug || source.id,
          pages,
        );
        const name = uniqueCopyName(source.name, pages);
        const id = pageIdFromSlug(slug);
        duplicateVisualPage(ed, pageId, { id, name, slug });
        clearVisualUndoHistory(ed);
        const next = pullConfigFromEditor();
        setPageMeta(next.pages ?? []);
        setActivePageId(id);
        writePageToUrl(id);
        setSaveState("dirty");
      } catch (err) {
        setPageError(
          err instanceof PageOpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to duplicate page",
        );
      }
    },
    [pullConfigFromEditor, writePageToUrl],
  );

  const handleDeletePage = useCallback(
    async (pageId: string) => {
      const ed = editorRef.current;
      if (!ed) return;
      setPageError(null);
      try {
        pullConfigFromEditor();
        deleteVisualPage(ed, pageId);
        clearVisualUndoHistory(ed);
        const next = pullConfigFromEditor();
        const active = getActiveVisualPageId(ed) || VISUAL_PAGE_HOME;
        setPageMeta(next.pages ?? []);
        setActivePageId(active);
        writePageToUrl(active);
        setSaveState("dirty");
      } catch (err) {
        setPageError(
          err instanceof PageOpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to delete page",
        );
      }
    },
    [pullConfigFromEditor, writePageToUrl],
  );

  const handleMovePage = useCallback(
    async (pageId: string, direction: "up" | "down") => {
      const ed = editorRef.current;
      if (!ed) return;
      setPageError(null);
      try {
        pullConfigFromEditor();
        const pages = [...ensureWebsitePages(configRef.current)];
        const index = pages.findIndex((p) => p.id === pageId);
        if (index < 0) return;
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= pages.length) return;
        // Keep home first
        if (pages[swapWith]?.id === VISUAL_PAGE_HOME && direction === "up") {
          return;
        }
        if (pages[index]?.id === VISUAL_PAGE_HOME) return;
        const tmp = pages[index];
        pages[index] = pages[swapWith];
        pages[swapWith] = tmp;
        reorderVisualPages(
          ed,
          pages.map((p) => p.id),
        );
        configRef.current.pages = reorderPageMeta(
          ensureWebsitePages(configRef.current),
          pages.map((p) => p.id),
        );
        const next = pullConfigFromEditor();
        setPageMeta(next.pages ?? []);
        setSaveState("dirty");
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Failed to reorder pages",
        );
      }
    },
    [pullConfigFromEditor],
  );

  const handleInsertBlock = useCallback(
    (
      blockId: string,
      variantId?: string,
      placement?: { targetComponentId?: string; position?: "before" | "after" | "inside" },
    ) => {
      const ed = editorRef.current;
      if (!ed) return;
      const result = insertVisualBlock(ed, {
        blockId,
        locale,
        variantId,
        existingSectionIds: (configRef.current.sections ?? []).map((s) => s.id),
        colors: configRef.current.brand.colors,
        targetComponentId: placement?.targetComponentId,
        position: placement?.position,
      });
      if (!result.ok) {
        setPageError(result.error);
        return;
      }
      setPageError(null);
      refreshDirtyFromEditor();
      syncHistoryFlags();
    },
    [locale, refreshDirtyFromEditor, syncHistoryFlags],
  );

  useEffect(() => {
    refreshDirtyRef.current = refreshDirtyFromEditor;
    syncHistoryRef.current = syncHistoryFlags;
  }, [refreshDirtyFromEditor, syncHistoryFlags]);

  const persist = useCallback(async () => {
    const queue = saveQueueRef.current;
    if (!queue) return false;
    const nextConfig = pullConfigFromEditor();
    setSaveState("saving");
    setSaveMessage(null);
    const result = await queue.enqueue(nextConfig);
    if (!result) {
      // queued behind another save — state will settle when that finishes
      return false;
    }
    if (!result.ok) {
      setSaveState(result.conflict ? "conflict" : "error");
      setSaveMessage(result.message);
      return false;
    }
    configRef.current = result.config;
    setMediaMap(result.config.media);
    lastSavedFingerprint.current = visualProjectFingerprint(
      result.config.visualEditor?.project ?? {},
    );
    setSaveState("saved");
    setSaveMessage(null);
    window.setTimeout(() => {
      setSaveState((s) => (s === "saved" ? "clean" : s));
    }, 1600);
    return true;
  }, [pullConfigFromEditor]);

  useEffect(() => {
    saveQueueRef.current = createSaveQueue({
      websiteId: website.id,
      getExpectedVersion: () => versionRef.current,
      setExpectedVersion: (v) => {
        versionRef.current = v;
      },
    });
    lastSavedFingerprint.current = visualProjectFingerprint(
      website.config.visualEditor?.project ??
        websiteConfigToVisualProject(website.config),
    );
  }, [website.id, website.config]);

  useEffect(() => {
    if (saveState !== "dirty") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist();
    }, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [saveState, persist]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (saveState === "dirty" || saveState === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = resolveBuilderShortcut({
        typingTarget: isTypingTarget(event.target),
        hasSelection,
        locked: selectionLocked,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        key: event.key,
      });
      if (!action) return;
      if (!canApplyShortcutAction(action, { hasSelection, locked: selectionLocked })) {
        return;
      }
      const ed = editorRef.current;
      if (!ed) return;

      if (action === "undo") {
        event.preventDefault();
        visualUndo(ed);
        refreshDirtyFromEditor();
        return;
      }
      if (action === "redo") {
        event.preventDefault();
        visualRedo(ed);
        refreshDirtyFromEditor();
        return;
      }
      if (action === "escape") {
        event.preventDefault();
        ed.select(undefined as never);
        setHoverBadge(null);
        return;
      }
      if (action === "select-parent") {
        event.preventDefault();
        const sel = ed.getSelected();
        const parent = sel?.parent?.();
        if (parent && !parent.is("wrapper")) ed.select(parent);
        return;
      }
      if (action === "duplicate") {
        event.preventDefault();
        duplicateSelected(ed);
        refreshDirtyFromEditor();
        return;
      }
      if (action === "delete") {
        event.preventDefault();
        deleteSelected(ed);
        refreshDirtyFromEditor();
        return;
      }
      if (action === "hide") {
        event.preventDefault();
        toggleSelectedVisibility(ed);
        refreshDirtyFromEditor();
        return;
      }
      if (action === "lock") {
        event.preventDefault();
        const next = toggleSelectedLock(ed);
        if (next != null) setSelectionLocked(next);
        refreshDirtyFromEditor();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    hasSelection,
    selectionLocked,
    refreshDirtyFromEditor,
  ]);

  // Track empty canvas for empty-state UX (sections only under wrapper)
  useEffect(() => {
    if (!editorInstance) {
      setCanvasEmpty(false);
      return;
    }
    const check = () => {
      const wrapper = editorInstance.getWrapper();
      if (!wrapper) {
        setCanvasEmpty(true);
        return;
      }
      const kids = wrapper.components?.();
      const models = Array.isArray(kids)
        ? kids
        : ((kids as { models?: unknown[] } | undefined)?.models ?? []);
      setCanvasEmpty(models.length === 0);
    };
    check();
    editorInstance.on("component:add", check);
    editorInstance.on("component:remove", check);
    editorInstance.on("load", check);
    editorInstance.on("page:select", check);
    return () => {
      editorInstance.off("component:add", check);
      editorInstance.off("component:remove", check);
      editorInstance.off("load", check);
      editorInstance.off("page:select", check);
    };
  }, [editorInstance]);

  useEffect(() => {
    setShellHydrated(true);
  }, []);

  useEffect(() => {
    if (!shellHydrated) return;
    const mountId = ++editorMountIdRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let created: Editor | null = null;

    void (async () => {
      try {
        // Ensure remounts start from a clean host (Strict Mode / HMR).
        canvas.replaceChildren();
        blocksRef.current?.replaceChildren();
        layersRef.current?.replaceChildren();
        stylesRef.current?.replaceChildren();
        traitsRef.current?.replaceChildren();
        if (editorMountIdRef.current !== mountId) return;
        const project = websiteConfigToVisualProject(configRef.current);
        const mediaAssets = Object.entries(configRef.current.media).map(
          ([id, media]) => ({
            id,
            src: media.url,
            name: media.alt || id,
            type: media.type,
          }),
        );
        const editor = await createVisualEditor({
          panels: {
            canvas,
            blocks: blocksRef.current,
            layers: layersRef.current,
            styles: stylesRef.current,
            traits: traitsRef.current,
          },
          project,
          locale,
          mediaAssets,
          isCurrent: () => editorMountIdRef.current === mountId,
          onUpdate: () => {
            if (editorMountIdRef.current !== mountId) return;
            refreshDirtyRef.current();
          },
          onSelection: () => {
            if (editorMountIdRef.current !== mountId) return;
            const ed = editorRef.current;
            const selected = ed?.getSelected();
            const ok = Boolean(selected && !selected.is("wrapper"));
            setHasSelection(ok);
            const tag = String(selected?.get("tagName") || "").toLowerCase();
            const type = String(selected?.get("type") || "");
            setSelectedIsImage(
              Boolean(
                selected &&
                  (selected.is("image") ||
                    tag === "img" ||
                    type === "image"),
              ),
            );
            setSelectedIsText(
              Boolean(
                selected &&
                  (type === "text" ||
                    ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button"].includes(
                      tag,
                    )),
              ),
            );
            if (!selected || selected.is("wrapper")) {
              setSelectionCrumbs([]);
              setSelectionLocked(false);
              setSelectedIsSection(false);
              setSectionVariants([]);
              setActiveVariantId(null);
              return;
            }
            const crumbs: Array<{ id: string; label: string }> = [];
            let walk = selected;
            for (let i = 0; i < 8; i++) {
              const a = (walk.getAttributes?.() ?? {}) as Record<
                string,
                string
              >;
              const label = formatComponentLabel(a, {
                locale,
                tagName: String(walk.get("tagName") || ""),
              });
              if (label) {
                crumbs.unshift({ id: walk.getId(), label });
              }
              const parent = walk.parent?.();
              if (!parent || parent.is("wrapper")) break;
              walk = parent;
            }
            setSelectionCrumbs(withPageBreadcrumbRoot(crumbs, locale));
            setSelectionLocked(
              String(selected.getAttributes?.()?.["data-locked"] ?? "") ===
                "true",
            );

            let section = selected;
            while (section && !section.getAttributes?.()?.["data-section-id"]) {
              const parent = section.parent?.();
              if (!parent || parent.is("wrapper")) break;
              section = parent;
            }
            const sattrs = section?.getAttributes?.() ?? {};
            const isSec = Boolean(sattrs["data-section-id"]);
            setSelectedIsSection(isSec);
            if (isSec && sattrs["data-section-type"]) {
              const block = getVisualBlock(`section-${sattrs["data-section-type"]}`);
              setSectionVariants(
                (block?.variants ?? []).map((v) => ({
                  id: v.id,
                  label: locale === "fa" ? v.label.fa : v.label.en,
                })),
              );
              setActiveVariantId(sattrs["data-section-variant"] || null);
            } else {
              setSectionVariants([]);
              setActiveVariantId(null);
            }
          },
          websiteConfig: configRef.current,
          onHover: (payload) => {
            if (editorMountIdRef.current !== mountId) return;
            if (!payload) {
              setHoverBadge(null);
              return;
            }
            setHoverBadge({
              id: payload.id,
              label: formatComponentLabel(
                {
                  "data-component-type": payload.label,
                  "data-section-type": payload.label,
                },
                { locale },
              ),
            });
          },
        });

        if (!editor || editorMountIdRef.current !== mountId) {
          if (editor) destroyVisualEditor(editor);
          return;
        }

        created = editor;
        editorRef.current = editor;
        setEditorInstance(editor);
        // Fingerprint AFTER loadProjectData — GrapesJS normalizes the project on load.
        lastSavedFingerprint.current = visualProjectFingerprint(
          serializeVisualProject(editor),
        );
        // Drop load/normalization history so Undo starts clean.
        try {
          editor.UndoManager.clear();
        } catch {
          // older grapes builds may not expose clear
        }
        const syncedPages = ensureWebsitePages({
          ...configRef.current,
          visualEditor: {
            engine: "grapesjs",
            version: 2,
            project: serializeVisualProject(editor) as Record<string, unknown>,
          },
        });
        configRef.current.pages = syncedPages;
        setPageMeta(syncedPages);
        const preferred =
          initialPageFromUrlRef.current ||
          configRef.current.visualEditor?.activePageId ||
          getActiveVisualPageId(editor) ||
          VISUAL_PAGE_HOME;
        const available = editor.Pages.getAll().map((p) => p.getId());
        const safePreferred = available.includes(preferred)
          ? preferred
          : available[0] || VISUAL_PAGE_HOME;
        selectVisualPage(editor, safePreferred);
        setActivePageId(safePreferred);
        setVisualDevice(editor, "desktop");
        setVisualZoom(editor, 100);
        syncHistoryRef.current();
        setReady(true);
        setInitError(null);
      } catch (err) {
        if (editorMountIdRef.current === mountId) {
          setInitError(
            err instanceof Error
              ? err.message
              : "Failed to start visual editor",
          );
          setReady(false);
        }
      }
    })();

    return () => {
      // Invalidate this mount so any in-flight init destroys itself and cannot
      // call destroy() on a newer editor sharing the same canvas host.
      if (editorMountIdRef.current === mountId) {
        editorMountIdRef.current = mountId + 1;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (created) {
        destroyVisualEditor(created);
        if (editorRef.current === created) {
          editorRef.current = null;
        }
        setEditorInstance(null);
      }
    };
  }, [locale, website.id, shellHydrated]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !ready) return;
    setVisualDevice(ed, device);
  }, [device, ready]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !ready) return;
    setVisualZoom(ed, zoom === "fit" ? "fit" : zoom);
  }, [zoom, ready]);

  const statusLabel = useMemo(() => {
    if (saveState === "dirty") return isFa ? "ذخیره‌نشده" : "Unsaved changes";
    if (saveState === "saving") return isFa ? "در حال ذخیره…" : "Saving…";
    if (saveState === "saved") return isFa ? "ذخیره شد" : "Saved";
    if (saveState === "error") return isFa ? "خطا در ذخیره" : "Save failed";
    if (saveState === "conflict")
      return isFa ? "تداخل نسخه" : "Version conflict";
    return isFa ? "آماده" : "Ready";
  }, [saveState, isFa]);

  if (initError) {
    return (
      <div className="ve-error" role="alert">
        <h1 style={{ fontSize: 18, margin: 0 }}>
          {isFa ? "ویرایشگر بصری بارگذاری نشد" : "Visual editor failed"}
        </h1>
        <p style={{ color: "#8a8a93", margin: 0 }}>{initError}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="ve-btn ve-btn--primary"
            onClick={() => window.location.reload()}
          >
            {isFa ? "تلاش دوباره" : "Retry"}
          </button>
          <Link
            href={`/${locale}/editor/${website.id}`}
            className="ve-btn"
            style={{ textDecoration: "none" }}
          >
            {isFa ? "بازگشت به Classic" : "Open Classic Editor"}
          </Link>
        </div>
      </div>
    );
  }

  if (!shellHydrated) {
    return (
      <div
        className="ve-shell"
        dir={isFa ? "rtl" : "ltr"}
        lang={locale}
        aria-busy="true"
      >
        <div
          className="ve-loading"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#09090b",
            color: "#8a8a93",
            fontSize: 14,
          }}
        >
          {isFa ? "در حال بارگذاری ویرایشگر…" : "Loading website editor…"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="ve-shell"
      dir={isFa ? "rtl" : "ltr"}
      lang={locale}
    >
      {!ready ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "#09090b",
          }}
        >
          <VisualEditorLoading
            label={
              isFa ? "در حال بارگذاری ویرایشگر…" : "Loading website editor…"
            }
          />
        </div>
      ) : null}

      {saveState === "conflict" || saveState === "error" ? (
        <div
          role="alert"
          style={{
            background: saveState === "conflict" ? "#3f2a14" : "#3f1419",
            color: "#fff",
            padding: "8px 12px",
            fontSize: 12,
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            {saveMessage ||
              (saveState === "conflict"
                ? isFa
                  ? "سایت جای دیگری تغییر کرده. تغییرات شما هنوز اینجاست — صفحه را دوباره بارگذاری کن یا دوباره ذخیره کن."
                  : "Site changed elsewhere. Your edits are still here — reload or retry save."
                : isFa
                  ? "ذخیره ناموفق بود."
                  : "Save failed.")}
          </span>
          <button
            type="button"
            className="ve-btn ve-btn--primary"
            onClick={() => void persist()}
          >
            {isFa ? "تلاش دوباره" : "Retry save"}
          </button>
        </div>
      ) : null}

      <header className="ve-topbar">
        <div className="ve-topbar__brand">
          <Link
            href={`/${locale}/dashboard`}
            className="ve-btn ve-btn--ghost"
            aria-label={isFa ? "بازگشت" : "Back"}
            title={isFa ? "بازگشت" : "Back"}
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="ve-topbar__title">{siteName}</span>
        </div>

        <div className="ve-topbar__group" role="group" aria-label="Viewport">
          {VISUAL_DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              className="ve-btn"
              data-active={device === d.id}
              aria-pressed={device === d.id}
              onClick={() => setDevice(d.id)}
            >
              {isFa ? d.label.fa : d.label.en}
            </button>
          ))}
        </div>

        <div className="ve-topbar__group">
          <button
            type="button"
            className="ve-btn"
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo"
            onClick={() => {
              const ed = editorRef.current;
              if (!ed) return;
              visualUndo(ed);
              refreshDirtyFromEditor();
            }}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            className="ve-btn"
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo"
            onClick={() => {
              const ed = editorRef.current;
              if (!ed) return;
              visualRedo(ed);
              refreshDirtyFromEditor();
            }}
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="ve-topbar__group" role="group" aria-label="Zoom">
          <select
            className="ve-btn"
            value={String(zoom)}
            aria-label="Zoom"
            onChange={(e) => {
              const v = e.target.value;
              setZoom(v === "fit" ? "fit" : (Number(v) as VisualZoomMode));
            }}
          >
            {VISUAL_ZOOM_OPTIONS.map((z) => (
              <option key={String(z)} value={String(z)}>
                {z === "fit" ? "Fit" : `${z}%`}
              </option>
            ))}
          </select>
        </div>

        <div className="ve-topbar__group ve-topbar__actions">
          <span className="ve-status" data-state={saveState}>
            {statusLabel}
          </span>
          <Link
            href={`/${locale}/preview/${website.id}${
              activePageId && activePageId !== VISUAL_PAGE_HOME
                ? `?page=${encodeURIComponent(activePageId)}`
                : ""
            }`}
            target="_blank"
            className="ve-btn"
            style={{ textDecoration: "none" }}
          >
            {isFa ? "پیش‌نمایش" : "Preview"}
          </Link>
          <Link
            href={`/${locale}/editor/${website.id}`}
            className="ve-btn"
            style={{ textDecoration: "none" }}
            title={isFa ? "ویرایشگر کلاسیک" : "Classic Editor"}
          >
            Classic
          </Link>
          <button
            type="button"
            className="ve-btn ve-btn--primary"
            onClick={() => void persist()}
            disabled={saveState === "saving"}
          >
            <Save size={14} />
            {isFa ? "ذخیره" : "Save"}
          </button>
        </div>
      </header>

      <div className="ve-body">
        <aside className="ve-sidebar" aria-label="Library">
          <div className="ve-tabs" role="tablist">
            {(
              [
                ["pages", isFa ? "صفحات" : "Pages"],
                ["library", isFa ? "کتابخانه" : "Library"],
                ["navigator", isFa ? "لایه‌ها" : "Layers"],
                ["assets", isFa ? "رسانه" : "Assets"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className="ve-tab"
                data-active={leftTab === id}
                aria-selected={leftTab === id}
                onClick={() => setLeftTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ve-panel">
            {leftTab === "pages" ? (
              <VisualPagesPanel
                pages={pageMeta}
                activePageId={activePageId}
                isFa={isFa}
                error={pageError}
                onSelect={switchToPage}
                onCreate={handleCreatePage}
                onRename={handleRenamePage}
                onDuplicate={handleDuplicatePage}
                onDelete={handleDeletePage}
                onMove={handleMovePage}
              />
            ) : null}
            {leftTab === "library" ? (
              <VisualBlockLibrary isFa={isFa} onInsert={handleInsertBlock} />
            ) : null}
            {/* Hidden GrapesJS BlockManager host — keeps drag registration alive */}
            <div ref={blocksRef} hidden aria-hidden="true" />
            {leftTab === "navigator" ? (
              <VisualNavigator
                editor={editorInstance}
                isFa={isFa}
                onChange={refreshDirtyFromEditor}
              />
            ) : null}
            {leftTab === "assets" ? (
              <div>
                <p className="ve-assets-hint" style={{ marginBottom: 8 }}>
                  {isFa
                    ? "رسانه‌های سایت. تصویر را روی Canvas انتخاب کنید سپس یک دارایی را بزنید."
                    : "Site media. Select an image on the canvas, then click an asset to replace it."}
                </p>
                <button
                  type="button"
                  className="ve-btn"
                  style={{ marginBottom: 8, width: "100%" }}
                  onClick={() => {
                    const ed = editorRef.current;
                    if (ed) openAssetManager(ed);
                  }}
                >
                  <ImageIcon size={14} />
                  {isFa ? "باز کردن Asset Manager" : "Open Asset Manager"}
                </button>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {mediaList
                    .filter((m) => m.type === "image")
                    .map((media) => (
                      <button
                        key={media.id}
                        type="button"
                        className="ve-page-item"
                        style={{ padding: 4 }}
                        title={media.alt || media.id}
                        onClick={() => {
                          const ed = editorRef.current;
                          if (!ed) return;
                          const ok = applyMediaToSelectedImage(ed, {
                            id: media.id,
                            url: media.url,
                            alt: media.alt,
                          });
                          if (!ok) {
                            openAssetManager(ed);
                          } else {
                            refreshDirtyFromEditor();
                          }
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={media.url}
                          alt={media.alt || media.id}
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                            objectFit: "cover",
                            borderRadius: 6,
                            display: "block",
                          }}
                        />
                      </button>
                    ))}
                  {!mediaList.some((m) => m.type === "image") ? (
                    <p className="ve-assets-hint">
                      {isFa
                        ? "هنوز تصویری نیست — از Classic Editor یا Media API آپلود کنید."
                        : "No images yet — upload via Classic Editor / Media API."}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <main
          className="ve-canvas-wrap"
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("text/ve-block-id")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            const ed = editorRef.current;
            const blockId =
              e.dataTransfer.getData("text/ve-block-id") ||
              getActiveLibraryDrag() ||
              "section-hero";
            if (!ed) return;
            const hint = resolveCanvasDropHint(
              ed,
              e.clientX,
              e.clientY,
              blockId,
            );
            setDropHint(hint);
          }}
          onDragLeave={() => setDropHint(null)}
          onDrop={(e) => {
            const blockId = e.dataTransfer.getData("text/ve-block-id");
            if (!blockId) return;
            e.preventDefault();
            const ed = editorRef.current;
            const hint = ed
              ? resolveCanvasDropHint(ed, e.clientX, e.clientY, blockId)
              : null;
            setDropHint(null);
            handleInsertBlock(blockId, undefined, {
              targetComponentId: hint?.targetId,
              position: hint?.position,
            });
          }}
        >
          {dropHint ? (
            <div
              className="ve-drop-indicator"
              data-accepted={dropHint.accepted}
              data-position={dropHint.position}
              style={
                dropHint.indicatorTop != null
                  ? { top: Math.max(48, dropHint.indicatorTop - 40) }
                  : undefined
              }
              aria-hidden
            >
              <span className="ve-drop-indicator__line" />
              <span className="ve-drop-indicator__label">
                {dropHint.accepted
                  ? dropPositionLabel(dropHint.position, locale)
                  : isFa
                    ? "محل نامعتبر"
                    : "Invalid target"}
              </span>
              <span className="ve-drop-indicator__line" />
            </div>
          ) : null}
          {hoverBadge && !hasSelection ? (
            <div className="ve-hover-badge" aria-hidden>
              {hoverBadge.label}
            </div>
          ) : null}
          {canvasEmpty && ready ? (
            <div className="ve-canvas-empty" role="status">
              <p>
                {isFa
                  ? "این صفحه خالی است"
                  : "This page is empty"}
              </p>
              <p className="ve-canvas-empty__hint">
                {isFa
                  ? "یک کامپوننت را بکشید یا از کتابخانه اضافه کنید."
                  : "Drag a component here or add one from the library."}
              </p>
              <button
                type="button"
                className="ve-btn ve-btn--primary"
                onClick={() => {
                  setLeftTab("library");
                  handleInsertBlock("layout-container");
                }}
              >
                {isFa ? "+ افزودن کامپوننت" : "+ Add component"}
              </button>
            </div>
          ) : null}
          {selectionCrumbs.length > 0 ? (
            <nav
              className="ve-selection-crumb"
              aria-label={isFa ? "مسیر انتخاب" : "Selection breadcrumb"}
            >
              {selectionCrumbs.map((crumb, index) => (
                <span key={`${crumb.id}-${index}`}>
                  {index > 0 ? (
                    <span className="ve-selection-crumb__sep" aria-hidden>
                      {" / "}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="ve-selection-crumb__btn"
                    data-current={index === selectionCrumbs.length - 1}
                    onClick={() => {
                      const ed = editorRef.current;
                      if (!ed) return;
                      if (crumb.id === "page") {
                        ed.select(ed.getWrapper() as never);
                        return;
                      }
                      const wrapper = ed.getWrapper();
                      if (!wrapper) return;
                      const findById = (
                        cmp: { getId: () => string; components?: () => unknown },
                      ): typeof wrapper | null => {
                        if (cmp.getId() === crumb.id) return cmp as typeof wrapper;
                        const kids = cmp.components?.();
                        const list = Array.isArray(kids)
                          ? kids
                          : ((kids as { models?: Array<typeof wrapper> } | undefined)
                              ?.models ?? []);
                        for (const child of list) {
                          const hit = findById(
                            child as {
                              getId: () => string;
                              components?: () => unknown;
                            },
                          );
                          if (hit) return hit;
                        }
                        return null;
                      };
                      const target = findById(wrapper);
                      if (target) ed.select(target);
                    }}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </nav>
          ) : null}
          <div className="ve-device-edit-hint" aria-live="polite">
            {isFa ? "در حال ویرایش:" : "Editing"}{" "}
            <strong>{device}</strong>
          </div>
          <div className="ve-canvas-toolbar" aria-label="Contextual toolbar">
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection || selectionCrumbs.length < 2}
              aria-label={isFa ? "انتخاب والد" : "Select parent"}
              title={isFa ? "انتخاب والد" : "Select parent"}
              onClick={() => {
                const ed = editorRef.current;
                const sel = ed?.getSelected();
                const parent = sel?.parent?.();
                if (parent && !parent.is("wrapper")) ed?.select(parent);
              }}
            >
              <ArrowUp size={14} style={{ transform: "rotate(-90deg)" }} />
            </button>
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection || selectionLocked}
              aria-label={isFa ? "بالا" : "Move up"}
              title={isFa ? "بالا" : "Move up"}
              onClick={() => {
                const ed = editorRef.current;
                const sel = ed?.getSelected();
                if (!sel) return;
                moveComponentRelative(sel, "up");
                refreshDirtyFromEditor();
              }}
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection || selectionLocked}
              aria-label={isFa ? "پایین" : "Move down"}
              title={isFa ? "پایین" : "Move down"}
              onClick={() => {
                const ed = editorRef.current;
                const sel = ed?.getSelected();
                if (!sel) return;
                moveComponentRelative(sel, "down");
                refreshDirtyFromEditor();
              }}
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection || selectionLocked}
              aria-label="Duplicate"
              title="Duplicate"
              onClick={() => {
                const ed = editorRef.current;
                if (!ed) return;
                duplicateSelected(ed);
                refreshDirtyFromEditor();
              }}
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection}
              aria-label={selectionLocked ? "Unlock" : "Lock"}
              title={selectionLocked ? "Unlock" : "Lock"}
              aria-pressed={selectionLocked}
              onClick={() => {
                const ed = editorRef.current;
                if (!ed) return;
                const next = toggleSelectedLock(ed);
                if (next != null) setSelectionLocked(next);
                refreshDirtyFromEditor();
              }}
            >
              {selectionLocked ? "Unlock" : "Lock"}
            </button>
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection || selectionLocked}
              aria-label="Hide"
              title="Hide"
              onClick={() => {
                const ed = editorRef.current;
                if (!ed) return;
                toggleSelectedVisibility(ed);
                refreshDirtyFromEditor();
              }}
            >
              <EyeOff size={14} />
            </button>
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection || selectionLocked}
              aria-label="Delete"
              title="Delete"
              onClick={() => {
                const ed = editorRef.current;
                if (!ed) return;
                deleteSelected(ed);
                refreshDirtyFromEditor();
              }}
            >
              <Trash2 size={14} />
            </button>
            {selectedIsSection && sectionVariants.length > 0 ? (
              <select
                className="ve-pages__input"
                style={{ width: "auto", minWidth: 110, height: 32 }}
                aria-label={isFa ? "واریانت" : "Variant"}
                value={activeVariantId || sectionVariants[0]?.id || ""}
                onChange={(e) => {
                  const ed = editorRef.current;
                  if (!ed) return;
                  applySectionVariant(ed, e.target.value, {
                    locale,
                    colors: configRef.current.brand.colors,
                  });
                  setActiveVariantId(e.target.value);
                  refreshDirtyFromEditor();
                }}
              >
                {sectionVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            ) : null}
            {selectedIsText ? (
              <>
                <button
                  type="button"
                  className="ve-btn"
                  disabled={!hasSelection}
                  aria-label="Bold"
                  title="Bold"
                  onClick={() => {
                    const ed = editorRef.current;
                    const sel = ed?.getSelected();
                    if (!sel) return;
                    const weight = String(sel.getStyle()?.["font-weight"] || "");
                    sel.addStyle({
                      "font-weight": weight === "700" || weight === "bold" ? "400" : "700",
                    });
                    refreshDirtyFromEditor();
                  }}
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  className="ve-btn"
                  disabled={!hasSelection}
                  aria-label="Italic"
                  title="Italic"
                  onClick={() => {
                    const ed = editorRef.current;
                    const sel = ed?.getSelected();
                    if (!sel) return;
                    const style = String(sel.getStyle()?.["font-style"] || "");
                    sel.addStyle({
                      "font-style": style === "italic" ? "normal" : "italic",
                    });
                    refreshDirtyFromEditor();
                  }}
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  className="ve-btn"
                  disabled={!hasSelection}
                  aria-label="Align"
                  title="Align"
                  onClick={() => {
                    const ed = editorRef.current;
                    const sel = ed?.getSelected();
                    if (!sel) return;
                    const cur = String(sel.getStyle()?.["text-align"] || "start");
                    const cycle = ["start", "center", "end"] as const;
                    const next = cycle[(cycle.indexOf(cur as typeof cycle[number]) + 1) % cycle.length];
                    sel.addStyle({ "text-align": next });
                    refreshDirtyFromEditor();
                  }}
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  className="ve-btn"
                  disabled={!hasSelection}
                  aria-label="Link"
                  title="Link"
                  onClick={() => {
                    const ed = editorRef.current;
                    const sel = ed?.getSelected();
                    if (!sel) return;
                    const href = window.prompt(
                      isFa ? "آدرس لینک" : "Link URL",
                      sel.getAttributes()?.href || "https://",
                    );
                    if (href == null) return;
                    sel.addAttributes({ href });
                    if (String(sel.get("tagName") || "").toLowerCase() !== "a") {
                      sel.set("tagName", "a");
                    }
                    refreshDirtyFromEditor();
                  }}
                >
                  <Link2 size={14} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="ve-btn"
              disabled={!selectedIsImage}
              aria-label="Replace image"
              title="Replace image"
              onClick={() => {
                const ed = editorRef.current;
                if (ed) openAssetManager(ed);
              }}
            >
              <ImageIcon size={14} />
            </button>
            {selectedIsImage ? (
              <button
                type="button"
                className="ve-btn"
                aria-label="Alt"
                title="Alt text"
                onClick={() => {
                  const ed = editorRef.current;
                  const sel = ed?.getSelected();
                  if (!sel) return;
                  const next = window.prompt(
                    isFa ? "متن جایگزین" : "Alt text",
                    sel.getAttributes()?.alt || "",
                  );
                  if (next == null) return;
                  sel.addAttributes({ alt: next });
                  refreshDirtyFromEditor();
                }}
              >
                Alt
              </button>
            ) : null}
          </div>
          <div ref={canvasRef} className="ve-canvas-host" />
        </main>

        <aside className="ve-inspector" aria-label="Inspector">
          <div className="ve-tabs" role="tablist">
            <button
              type="button"
              className="ve-tab"
              data-active={rightTab === "inspector"}
              onClick={() => setRightTab("inspector")}
            >
              {isFa ? "بازرس" : "Inspector"}
            </button>
            <button
              type="button"
              className="ve-tab"
              data-active={rightTab === "style"}
              onClick={() => setRightTab("style")}
            >
              {isFa ? "استایل GJS" : "Style (GJS)"}
            </button>
          </div>
          <div className="ve-panel">
            {rightTab === "inspector" ? (
              <VisualInspectorPanel
                editor={editorInstance}
                isFa={isFa}
                device={device}
                onChange={refreshDirtyFromEditor}
              />
            ) : null}
            <div
              ref={stylesRef}
              style={{ display: rightTab === "style" ? "block" : "none" }}
            />
            <div ref={traitsRef} hidden aria-hidden="true" />
            <div ref={layersRef} hidden aria-hidden="true" />
          </div>
        </aside>
      </div>
    </div>
  );
}
