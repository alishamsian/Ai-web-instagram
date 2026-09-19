"use client";

/**
 * Visual Editor shell — GrapesJS engine + product chrome.
 * WebsiteConfig remains canonical; GrapesJS project lives under config.visualEditor.
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
  applyVisualProjectToWebsiteConfig,
  canVisualRedo,
  canVisualUndo,
  createVisualEditor,
  deleteSelected,
  destroyVisualEditor,
  duplicateSelected,
  getActiveVisualPageId,
  getVisualPages,
  saveWebsiteConfigViaApi,
  selectVisualPage,
  serializeVisualProject,
  setVisualDevice,
  toggleSelectedVisibility,
  visualRedo,
  visualUndo,
  websiteConfigToVisualProject,
  zoomToScale,
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
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";

type LeftTab = "pages" | "sections" | "blocks" | "components" | "assets";
type RightTab = "style" | "settings";

const AUTOSAVE_MS = 1000;

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
  const configRef = useRef<WebsiteConfig>(website.config);
  const versionRef = useRef(website.version);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<VisualSaveState>("clean");
  const [device, setDevice] = useState<VisualDeviceId>("desktop");
  const [zoom, setZoom] = useState<VisualZoomMode>(100);
  const [leftTab, setLeftTab] = useState<LeftTab>("blocks");
  const [rightTab, setRightTab] = useState<RightTab>("style");
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [activePageId, setActivePageId] = useState("home");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [siteName] = useState(
    website.config.brand.name || website.slug || "Website",
  );

  const syncHistoryFlags = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    setCanUndo(canVisualUndo(ed));
    setCanRedo(canVisualRedo(ed));
  }, []);

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

  const markDirty = useCallback(() => {
    setSaveState((prev) => (prev === "saving" ? prev : "dirty"));
    syncHistoryFlags();
    const ed = editorRef.current;
    if (ed) {
      setPages(getVisualPages(ed));
      const pid = getActiveVisualPageId(ed);
      if (pid) setActivePageId(pid);
    }
  }, [syncHistoryFlags]);

  const persist = useCallback(async () => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaveState("saving");
    const nextConfig = pullConfigFromEditor();
    const result = await saveWebsiteConfigViaApi({
      websiteId: website.id,
      config: nextConfig,
      expectedVersion: versionRef.current,
    });
    savingRef.current = false;
    if (!result.ok) {
      setSaveState("error");
      return false;
    }
    versionRef.current = result.version;
    configRef.current = result.config;
    setSaveState("saved");
    window.setTimeout(() => {
      setSaveState((s) => (s === "saved" ? "clean" : s));
    }, 1600);
    return true;
  }, [pullConfigFromEditor, website.id]);

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
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    void (async () => {
      try {
        const project = websiteConfigToVisualProject(configRef.current);
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
          onUpdate: () => {
            if (!cancelled) markDirty();
          },
          onSelection: () => {
            if (cancelled) return;
            const ed = editorRef.current;
            setHasSelection(Boolean(ed?.getSelected() && !ed.getSelected()?.is("wrapper")));
          },
        });
        if (cancelled) {
          destroyVisualEditor(editor);
          return;
        }
        editorRef.current = editor;
        setPages(getVisualPages(editor));
        const preferred =
          configRef.current.visualEditor?.activePageId ||
          getActiveVisualPageId(editor) ||
          "home";
        selectVisualPage(editor, preferred);
        setActivePageId(preferred);
        setVisualDevice(editor, "desktop");
        syncHistoryFlags();
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setInitError(
            err instanceof Error ? err.message : "Failed to start visual editor",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      destroyVisualEditor(editorRef.current);
      editorRef.current = null;
    };
  }, [locale, markDirty, syncHistoryFlags]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !ready) return;
    setVisualDevice(ed, device);
  }, [device, ready]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !ready) return;
    const frame = ed.Canvas.getFrameEl();
    const wrapper = frame?.parentElement;
    if (wrapper) {
      const scale = zoomToScale(zoom);
      wrapper.style.transform = zoom === "fit" ? "" : `scale(${scale})`;
      wrapper.style.transformOrigin = "top center";
    }
  }, [zoom, ready]);

  const statusLabel = useMemo(() => {
    if (saveState === "dirty") return isFa ? "ذخیره‌نشده" : "Unsaved changes";
    if (saveState === "saving") return isFa ? "در حال ذخیره…" : "Saving…";
    if (saveState === "saved") return isFa ? "ذخیره شد" : "Saved";
    if (saveState === "error") return isFa ? "خطا در ذخیره" : "Save error";
    return isFa ? "ذخیره‌شده" : "Saved";
  }, [saveState, isFa]);

  if (initError) {
    return (
      <div className="ve-error" role="alert">
        <h1 style={{ fontSize: 18, margin: 0 }}>
          {isFa ? "ویرایشگر بصری بارگذاری نشد" : "Visual editor failed"}
        </h1>
        <p style={{ color: "#8a8a93", margin: 0 }}>{initError}</p>
        <Link
          href={`/${locale}/editor/${website.id}`}
          className="ve-btn ve-btn--primary"
          style={{ textDecoration: "none" }}
        >
          {isFa ? "بازگشت به Classic" : "Open Classic Editor"}
        </Link>
      </div>
    );
  }

  return (
    <div className="ve-shell" dir="ltr" lang={locale}>
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
              markDirty();
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
              markDirty();
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
                      selectVisualPage(ed, page.id);
                      setActivePageId(page.id);
                      markDirty();
                    }}
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            ) : null}
            <div
              ref={blocksRef}
              hidden={leftTab !== "blocks" && leftTab !== "sections"}
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
                  ? "رجیستری کامپوننت‌ها در Phase ۲ متصل می‌شود. فعلاً از Blocks و Sections استفاده کنید."
                  : "Component registry connects in Phase 2. Use Blocks and Sections for now."}
              </p>
            ) : null}
            {leftTab === "assets" ? (
              <p className="ve-assets-hint">
                {isFa
                  ? "Asset Manager در Phase بعد. تصویر را روی Canvas انتخاب کنید و src را در Settings تغییر دهید."
                  : "Asset Manager comes next. Select an image on the canvas and edit its src in Settings."}
              </p>
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
                markDirty();
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
                markDirty();
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
                markDirty();
              }}
            >
              <Trash2 size={14} />
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
