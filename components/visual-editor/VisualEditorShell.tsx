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
import type { Editor } from "grapesjs";
import type { WebsiteConfig, WebsiteRecord } from "@/types/website";
import type { Locale } from "@/lib/config/env";
import {
  applyMediaToSelectedImage,
  applyVisualProjectToWebsiteConfig,
  canVisualRedo,
  canVisualUndo,
  createSaveQueue,
  createVisualEditor,
  deleteSelected,
  destroyVisualEditor,
  duplicateSelected,
  getActiveVisualPageId,
  getVisualPages,
  openAssetManager,
  selectVisualPage,
  serializeVisualProject,
  setVisualDevice,
  setVisualZoom,
  toggleSelectedVisibility,
  visualProjectFingerprint,
  visualRedo,
  visualUndo,
  websiteConfigToVisualProject,
  type VisualDeviceId,
  type VisualSaveState,
  type VisualZoomMode,
  VISUAL_DEVICES,
  VISUAL_ZOOM_OPTIONS,
} from "@/lib/visual-editor";
import { VisualEditorLoading } from "@/components/visual-editor/VisualEditorLoading";
import "@/app/visual-editor.css";
import "grapesjs/dist/css/grapes.min.css";
import {
  ArrowLeft,
  Copy,
  EyeOff,
  ImageIcon,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

type LeftTab = "pages" | "sections" | "blocks" | "components" | "assets";
type RightTab = "style" | "settings";

const AUTOSAVE_MS = 1200;

export function VisualEditorShell({
  website,
  locale,
}: {
  website: WebsiteRecord;
  locale: Locale;
}) {
  const isFa = locale === "fa";
  const canvasRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const stylesRef = useRef<HTMLDivElement>(null);
  const traitsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const configRef = useRef<WebsiteConfig>(structuredClone(website.config));
  const versionRef = useRef(website.version);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedFingerprint = useRef("");
  const saveQueueRef = useRef<ReturnType<typeof createSaveQueue> | null>(null);
  /** Guards React Strict Mode / remount races so a late destroy cannot wipe a newer editor. */
  const editorMountIdRef = useRef(0);
  const refreshDirtyRef = useRef<() => void>(() => {});
  const syncHistoryRef = useRef<() => void>(() => {});

  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<VisualSaveState>("clean");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [device, setDevice] = useState<VisualDeviceId>("desktop");
  const [zoom, setZoom] = useState<VisualZoomMode>(100);
  const [leftTab, setLeftTab] = useState<LeftTab>("blocks");
  const [rightTab, setRightTab] = useState<RightTab>("style");
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [activePageId, setActivePageId] = useState(
    website.config.visualEditor?.activePageId || "home",
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedIsImage, setSelectedIsImage] = useState(false);
  const [mediaMap, setMediaMap] = useState(website.config.media);
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
    setPages(getVisualPages(ed));
    const pid = getActiveVisualPageId(ed);
    if (pid) setActivePageId(pid);
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
    return next;
  }, []);

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
            setSelectedIsImage(
              Boolean(
                selected &&
                  (selected.is("image") ||
                    selected.get("tagName") === "img" ||
                    selected.get("type") === "image"),
              ),
            );
          },
        });

        if (!editor || editorMountIdRef.current !== mountId) {
          if (editor) destroyVisualEditor(editor);
          return;
        }

        created = editor;
        editorRef.current = editor;
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
        setPages(getVisualPages(editor));
        const preferred =
          configRef.current.visualEditor?.activePageId ||
          getActiveVisualPageId(editor) ||
          "home";
        selectVisualPage(editor, preferred);
        setActivePageId(preferred);
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
      }
    };
  }, [locale, website.id]);

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
            href={`/${locale}/preview/${website.id}`}
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
                ["blocks", isFa ? "بلوک‌ها" : "Blocks"],
                ["sections", isFa ? "سکشن‌ها" : "Sections"],
                ["components", isFa ? "کامپوننت" : "Components"],
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
              <div className="ve-pages">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    className="ve-page-item"
                    data-active={activePageId === page.id}
                    onClick={() => {
                      const ed = editorRef.current;
                      if (!ed) return;
                      // Persist current page into project before switching
                      pullConfigFromEditor();
                      selectVisualPage(ed, page.id);
                      setActivePageId(page.id);
                      refreshDirtyFromEditor();
                    }}
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div
              ref={blocksRef}
              style={{
                display:
                  leftTab === "blocks" || leftTab === "sections"
                    ? "block"
                    : "none",
              }}
            />
            {leftTab === "components" ? (
              <p className="ve-assets-hint">
                {isFa
                  ? "رجیستری کامپوننت‌ها در Phase ۲. از Blocks و Sections استفاده کنید."
                  : "Component registry connects in Phase 2. Use Blocks and Sections for now."}
              </p>
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

        <main className="ve-canvas-wrap">
          <div className="ve-canvas-toolbar" aria-label="Contextual toolbar">
            <button
              type="button"
              className="ve-btn"
              disabled={!hasSelection}
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
              disabled={!hasSelection}
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
          </div>
          <div ref={canvasRef} className="ve-canvas-host" />
        </main>

        <aside className="ve-inspector" aria-label="Inspector">
          <div className="ve-tabs" role="tablist">
            <button
              type="button"
              className="ve-tab"
              data-active={rightTab === "style"}
              onClick={() => setRightTab("style")}
            >
              {isFa ? "استایل" : "Style"}
            </button>
            <button
              type="button"
              className="ve-tab"
              data-active={rightTab === "settings"}
              onClick={() => setRightTab("settings")}
            >
              {isFa ? "تنظیمات" : "Settings"}
            </button>
          </div>
          <div className="ve-panel">
            <div
              ref={stylesRef}
              style={{ display: rightTab === "style" ? "block" : "none" }}
            />
            <div
              ref={traitsRef}
              style={{ display: rightTab === "settings" ? "block" : "none" }}
            />
            <div
              ref={layersRef}
              style={{ marginTop: 16 }}
              aria-label="Layers"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
