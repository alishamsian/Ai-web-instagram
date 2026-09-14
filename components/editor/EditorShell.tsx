"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WebsiteConfig, WebsiteRecord, WebsiteSectionType } from "@/types/website";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import {
  cloneConfig,
  configsEqual,
  sectionLabel,
} from "@/components/editor/editor-utils";
import { fieldToSectionType } from "@/components/editor/editor-selection";
import { polishWebsiteConfig } from "@/lib/website/polish";
import {
  EditorEditProvider,
  type EditorFieldPath,
  type SectionAction,
} from "@/components/editor/EditContext";
import {
  EditorSidebar,
  type LeftNavTab,
} from "@/components/editor/EditorSidebar";
import { EditorInspector } from "@/components/editor/EditorInspector";
import { SectionLibrary } from "@/components/editor/SectionLibrary";
import { PublishDialog } from "@/components/editor/PublishDialog";
import {
  EditorPaneHeader,
  EditorPhoneTabBar,
  EditorViewportBar,
} from "@/components/editor/EditorMobileChrome";
import { EditorCanvasFrame } from "@/components/editor/EditorCanvasFrame";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { EditorCommandPalette, type EditorCommandItem } from "@/components/editor/EditorCommandPalette";
import { HistoryPanel } from "@/components/editor/HistoryPanel";
import { QualityPanel } from "@/components/editor/QualityPanel";
import {
  createHistoryEntry,
  pushHistory,
  undoHistory,
  redoHistory,
  restoreHistoryIndex,
  resolveEditorKeyCommand,
  deviceFromViewport,
  viewportFromDevice,
  runPublishPreflight,
  scoreWebsiteQuality,
  commandAddSection,
  commandToggleSection,
  commandDeleteSection,
  commandDuplicateSection,
  commandMoveSection,
  applyEditorAction,
  proposeEditorActions,
  loadEditorUiState,
  saveEditorUiState,
  type HistoryEntry,
  type EditorViewportId,
  type EditorSectionTab,
  type EditorSiteGroup,
  EDITOR_HISTORY_LIMIT,
} from "@/lib/editor";
import {
  ArrowLeft,
} from "lucide-react";

const AUTOSAVE_MS = 900;

type PhonePane = "canvas" | "sections" | "inspector";

function flashTemplate(template: string, label: string) {
  return template.replace("{label}", label);
}

export function EditorShell({
  website,
  locale,
  plan = "free",
}: {
  website: WebsiteRecord;
  locale: Locale;
  plan?: "free" | "pro";
}) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const canRemoveBranding = plan === "pro";

  const [config, setConfig] = useState<WebsiteConfig>(() =>
    polishWebsiteConfig(cloneConfig(website.config)),
  );
  const [savedConfig, setSavedConfig] = useState<WebsiteConfig>(() =>
    polishWebsiteConfig(cloneConfig(website.config)),
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    createHistoryEntry(
      polishWebsiteConfig(cloneConfig(website.config)),
      "Initial",
    ),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [viewport, setViewport] = useState<EditorViewportId>("1280");
  const device = deviceFromViewport(viewport);
  const [leftNav, setLeftNav] = useState<LeftNavTab>("sections");
  const [activePage, setActivePage] = useState("home");
  const [phonePane, setPhonePane] = useState<PhonePane>("canvas");
  const [tabletInspectorOpen, setTabletInspectorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sectionTab, setSectionTab] = useState<EditorSectionTab>("content");
  const [siteGroup, setSiteGroup] = useState<EditorSiteGroup>("style");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "error">("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState(website.status);
  const [selectedField, setSelectedField] = useState<EditorFieldPath | undefined>();
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>();
  const [hoveredSectionId, setHoveredSectionId] = useState<string | undefined>();
  const [flash, setFlash] = useState<string | null>(null);
  const [canvasProduct, setCanvasProduct] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pendingLabel, setPendingLabel] = useState("Edit");
  const [uiHydrated, setUiHydrated] = useState(false);

  const skipHistory = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const autosaveRef = useRef<number | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const configRef = useRef(config);
  const savedConfigRef = useRef(savedConfig);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(0);

  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
    configRef.current = config;
    savedConfigRef.current = savedConfig;
  }, [history, historyIndex, config, savedConfig]);

  const dirty = !configsEqual(config, savedConfig);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isPublished = status === "published";

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (phone.matches) setViewport("390");
    };
    apply();
    phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  function flashMessage(message: string, ms = 2000) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), ms);
  }

  useEffect(() => {
    const saved = loadEditorUiState(website.id);
    if (saved) {
      if (saved.viewport) setViewport(saved.viewport);
      if (saved.selectedSectionId) {
        const exists = config.sections.some(
          (s) => s.id === saved.selectedSectionId,
        );
        if (exists) setSelectedSectionId(saved.selectedSectionId);
      }
      if (saved.focusMode != null) setFocusMode(saved.focusMode);
      if (saved.leftNav === "pages" || saved.leftNav === "sections") {
        setLeftNav(saved.leftNav);
      }
      if (saved.sectionTab) setSectionTab(saved.sectionTab);
      if (saved.siteGroup) setSiteGroup(saved.siteGroup);
    }
    setUiHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [website.id]);

  useEffect(() => {
    if (!uiHydrated) return;
    saveEditorUiState(website.id, {
      viewport,
      selectedSectionId: selectedSectionId ?? null,
      focusMode,
      leftNav,
      sectionTab,
      siteGroup,
    });
  }, [
    uiHydrated,
    website.id,
    viewport,
    selectedSectionId,
    focusMode,
    leftNav,
    sectionTab,
    siteGroup,
  ]);

  function commitHistory(snapshot: WebsiteConfig, label = pendingLabel) {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pushed = pushHistory({
      entries: historyRef.current,
      index: historyIndexRef.current,
      next: snapshot,
      label,
      limit: EDITOR_HISTORY_LIMIT,
    });
    historyRef.current = pushed.entries;
    historyIndexRef.current = pushed.index;
    setHistory(pushed.entries);
    setHistoryIndex(pushed.index);
  }

  function applyConfig(next: WebsiteConfig, label = "Edit") {
    setConfig(next);
    setPendingLabel(label);
    if (skipHistory.current) {
      skipHistory.current = false;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      commitHistory(next, label);
    }, 320);
  }

  function undo() {
    if (debounceRef.current) commitHistory(config, pendingLabel);
    const result = undoHistory({
      entries: historyRef.current,
      index: historyIndexRef.current,
    });
    if (!result.config) return;
    skipHistory.current = true;
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    setConfig(result.config);
    const label =
      historyRef.current[result.index]?.label ?? dict.editor.undo;
    flashMessage(flashTemplate(dict.editor.undoFlash, label));
  }

  function redo() {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const result = redoHistory({
      entries: historyRef.current,
      index: historyIndexRef.current,
    });
    if (!result.config) return;
    skipHistory.current = true;
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    setConfig(result.config);
    const label =
      historyRef.current[result.index]?.label ?? dict.editor.redo;
    flashMessage(flashTemplate(dict.editor.redoFlash, label));
  }

  function restoreHistory(index: number) {
    const result = restoreHistoryIndex({ entries: history, index });
    if (!result.config) return;
    skipHistory.current = true;
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    setConfig(result.config);
    setHistoryOpen(false);
  }

  const save = useCallback(async (snapshot?: WebsiteConfig) => {
    const payload = snapshot ?? configRef.current;
    if (configsEqual(payload, savedConfigRef.current)) return true;

    setSavePhase("saving");
    const run = async () => {
      try {
        const response = await fetch(`/api/websites/${website.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config: payload }),
        });
        if (!response.ok) {
          setSavePhase("error");
          flashMessage(dict.editor.saveFailed);
          return false;
        }
        const cloned = cloneConfig(payload);
        savedConfigRef.current = cloned;
        setSavedConfig(cloned);
        setSavedAt(Date.now());
        setSavePhase("idle");
        router.refresh();
        return true;
      } catch {
        setSavePhase("error");
        flashMessage(dict.editor.saveFailed);
        return false;
      }
    };

    const next = saveQueue.current.then(run, run);
    saveQueue.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, [dict.editor.saveFailed, router, website.id]);

  useEffect(() => {
    if (!dirty) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => {
      void save(configRef.current);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    };
  }, [config, dirty, save]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function handleSectionAction(sectionId: string, action: SectionAction) {
    let result = null;
    if (action === "toggle") {
      result = commandToggleSection(config, sectionId);
    } else if (action === "delete") {
      result = commandDeleteSection(config, sectionId);
    } else if (action === "duplicate") {
      result = commandDuplicateSection(config, sectionId);
    } else if (action === "move-up") {
      result = commandMoveSection(config, sectionId, "up");
    } else if (action === "move-down") {
      result = commandMoveSection(config, sectionId, "down");
    }
    if (!result) return;
    applyConfig(result.config, result.label);
    flashMessage(result.label, 1600);
    if (result.selectedSectionId !== undefined) {
      setSelectedSectionId(result.selectedSectionId ?? undefined);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA";

      const command = resolveEditorKeyCommand(event, {
        typing: Boolean(typing),
        hasSelection: Boolean(selectedSectionId),
      });
      if (!command) return;

      if (command === "escape") {
        if (focusMode) {
          setFocusMode(false);
          return;
        }
        setSelectedSectionId(undefined);
        setSelectedField(undefined);
        setLibraryOpen(false);
        setPublishOpen(false);
        setCommandOpen(false);
        setHistoryOpen(false);
        setQualityOpen(false);
        setPhonePane("canvas");
        setTabletInspectorOpen(false);
        return;
      }

      if (command === "focusMode") {
        event.preventDefault();
        setFocusMode((v) => !v);
        return;
      }

      if (command === "deleteSection" && selectedSectionId) {
        event.preventDefault();
        handleSectionAction(selectedSectionId, "delete");
        return;
      }

      if (command === "commandPalette") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (command === "undo") {
        event.preventDefault();
        undo();
      } else if (command === "redo") {
        event.preventDefault();
        redo();
      } else if (command === "save") {
        event.preventDefault();
        void save();
      } else if (command === "preview") {
        event.preventDefault();
        window.open(`/${locale}/preview/${website.id}`, "_blank");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history, config, dirty, selectedSectionId, locale, website.id, focusMode]);

  function selectField(path: EditorFieldPath, sectionId?: string) {
    setSelectedField(path);
    setSectionTab("content");
    const type = fieldToSectionType(path);
    const matched =
      sectionId ??
      (type
        ? config.sections.find((section) => section.type === type)?.id
        : undefined);
    if (matched) setSelectedSectionId(matched);
    setLeftNav("sections");
    setFocusMode(false);
    setPhonePane("inspector");
    setTabletInspectorOpen(true);
  }

  function selectSection(id: string | undefined) {
    setSelectedSectionId(id);
    setSelectedField(undefined);
    if (id) {
      setActivePage((page) => (page === "product" ? "home" : page));
      if (canvasProduct) setCanvasProduct(null);
      setFocusMode(false);
      setPhonePane("inspector");
      setTabletInspectorOpen(true);
    }
  }

  async function confirmPublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      if (dirty) {
        const ok = await save();
        if (!ok) {
          setPublishError(dict.editor.saveFailed);
          return;
        }
      }
      const nextPublished = !isPublished;
      const response = await fetch(`/api/websites/${website.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        if (body?.error === "NO_PRODUCTS") {
          setPublishError(dict.editor.publishNoProducts);
        } else {
          setPublishError(body?.message ?? dict.editor.saveFailed);
        }
        return;
      }
      setStatus(nextPublished ? "published" : "unpublished");
      flashMessage(
        nextPublished ? dict.editor.published : dict.editor.unpublished,
      );
      setPublishOpen(false);
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  function onPageChange(pageId: string) {
    setActivePage(pageId);
    setSelectedSectionId(undefined);
    setSelectedField(undefined);
    if (pageId === "home") {
      setCanvasProduct(null);
      return;
    }
    if (pageId === "product") {
      const first = config.content.products?.items.find(
        (item) => !item.hidden && (item.slug || item.id),
      );
      if (first) setCanvasProduct(first.slug ?? first.id ?? null);
      return;
    }
    setCanvasProduct(null);
    if (pageId === "shop") {
      const products = config.sections.find((s) => s.type === "products");
      if (products) setSelectedSectionId(products.id);
      return;
    }
    const typeMap: Record<string, WebsiteSectionType> = {
      about: "about",
      contact: "contact",
      faq: "faq",
    };
    const type = typeMap[pageId];
    if (type) {
      const section = config.sections.find((s) => s.type === type);
      if (section) setSelectedSectionId(section.id);
    }
  }

  const publishChanges = useMemo(() => {
    const items: string[] = [];
    if (dirty) {
      items.push(locale === "fa" ? "تغییرات ذخیره‌نشده" : "Unsaved edits");
    }
    if (selectedSectionId) {
      const section = config.sections.find((s) => s.id === selectedSectionId);
      if (section) {
        items.push(
          `${sectionLabel(section.type, locale)} ${locale === "fa" ? "انتخاب‌شده" : "selected"}`,
        );
      }
    }
    items.push(
      locale === "fa"
        ? `قالب ${config.template}`
        : `${config.template} template`,
    );
    return items;
  }, [config.sections, config.template, dirty, locale, selectedSectionId]);

  const saveLabel = (() => {
    if (savePhase === "saving") return dict.editor.saving;
    if (savePhase === "error") return dict.editor.saveFailed;
    if (dirty) return dict.editor.dirty;
    if (savedAt) {
      const seconds = Math.max(1, Math.round((now - savedAt) / 1000));
      if (seconds < 60) {
        return locale === "fa"
          ? `${dict.editor.savedAgo} ${seconds} ثانیه پیش`
          : `${dict.editor.savedAgo} ${seconds}s ago`;
      }
      return dict.editor.clean;
    }
    return dict.editor.clean;
  })();

  const inspectorTitle =
    activePage === "product" && canvasProduct
      ? dict.editor.productPage
      : selectedSectionId
        ? sectionLabel(
            config.sections.find((s) => s.id === selectedSectionId)?.type ??
              "hero",
            locale,
          )
        : dict.editor.website;

  function handleRestored(next: WebsiteConfig) {
    const cloned = cloneConfig(next);
    const entry = createHistoryEntry(cloned, "Restored version");
    setConfig(cloned);
    setSavedConfig(cloneConfig(next));
    savedConfigRef.current = cloneConfig(next);
    historyRef.current = [entry];
    historyIndexRef.current = 0;
    setHistory([entry]);
    setHistoryIndex(0);
    setSavedAt(Date.now());
    flashMessage(dict.editor.restored);
    router.refresh();
  }

  const commandItems = useMemo<EditorCommandItem[]>(() => {
    const isFa = locale === "fa";
    const sectionId = selectedSectionId;
    const items: EditorCommandItem[] = [
      {
        id: "undo",
        label: isFa ? "بازگردانی" : "Undo",
        hint: "⌘Z",
        group: isFa ? "ویرایش" : "Edit",
        run: () => {
          window.dispatchEvent(new CustomEvent("vitrin-editor-undo"));
        },
      },
      {
        id: "redo",
        label: isFa ? "جلو" : "Redo",
        hint: "⌘⇧Z",
        group: isFa ? "ویرایش" : "Edit",
        run: () => {
          window.dispatchEvent(new CustomEvent("vitrin-editor-redo"));
        },
      },
      {
        id: "save",
        label: isFa ? "ذخیره" : "Save",
        hint: "⌘S",
        group: isFa ? "ویرایش" : "Edit",
        run: () => {
          window.dispatchEvent(new CustomEvent("vitrin-editor-save"));
        },
      },
      {
        id: "preview",
        label: isFa ? "پیش‌نمایش" : "Preview",
        hint: "⌘P",
        group: isFa ? "نمایش" : "View",
        run: () => window.open(`/${locale}/preview/${website.id}`, "_blank"),
      },
      {
        id: "add-section",
        label: dict.editor.addSection,
        group: isFa ? "سکشن" : "Sections",
        run: () => setLibraryOpen(true),
      },
      {
        id: "history",
        label: isFa ? "تاریخچه" : "History",
        group: isFa ? "ویرایش" : "Edit",
        run: () => setHistoryOpen(true),
      },
      {
        id: "quality",
        label: dict.editor.quality,
        group: isFa ? "بازرسی" : "Audit",
        run: () => setQualityOpen(true),
      },
      {
        id: "focus-mode",
        label: focusMode ? dict.editor.focusModeExit : dict.editor.focusMode,
        hint: "⌘\\",
        group: isFa ? "نمایش" : "View",
        run: () => setFocusMode((v) => !v),
      },
      {
        id: "viewport-mobile",
        label: isFa ? "ویوپورت موبایل" : "Mobile viewport",
        group: isFa ? "نمایش" : "View",
        run: () => setViewport("390"),
      },
      {
        id: "viewport-desktop",
        label: isFa ? "ویوپورت دسکتاپ" : "Desktop viewport",
        group: isFa ? "نمایش" : "View",
        run: () => setViewport("1280"),
      },
      {
        id: "publish",
        label: isPublished ? dict.editor.unpublish : dict.editor.publish,
        group: isFa ? "انتشار" : "Publish",
        run: () => {
          setPublishError(null);
          setPublishOpen(true);
        },
      },
      {
        id: "magic-editorial",
        label: isFa ? "بازتایپ ادیتوریال" : "Restyle editorial",
        group: isFa ? "هوش مصنوعی" : "AI",
        run: () => {
          window.dispatchEvent(
            new CustomEvent("vitrin-editor-ai-restyle", {
              detail: { direction: "editorial" },
            }),
          );
        },
      },
    ];

    if (sectionId) {
      items.push(
        {
          id: "dup-section",
          label: isFa ? "تکثیر سکشن" : "Duplicate section",
          group: isFa ? "سکشن" : "Sections",
          run: () => {
            window.dispatchEvent(
              new CustomEvent("vitrin-editor-section", {
                detail: { id: sectionId, action: "duplicate" },
              }),
            );
          },
        },
        {
          id: "hide-section",
          label: isFa ? "نمایش/مخفی سکشن" : "Toggle section visibility",
          group: isFa ? "سکشن" : "Sections",
          run: () => {
            window.dispatchEvent(
              new CustomEvent("vitrin-editor-section", {
                detail: { id: sectionId, action: "toggle" },
              }),
            );
          },
        },
        {
          id: "delete-section",
          label: isFa ? "حذف سکشن" : "Delete section",
          group: isFa ? "سکشن" : "Sections",
          run: () => {
            window.dispatchEvent(
              new CustomEvent("vitrin-editor-section", {
                detail: { id: sectionId, action: "delete" },
              }),
            );
          },
        },
      );
    }

    return items;
  }, [
    dict.editor.addSection,
    dict.editor.publish,
    dict.editor.unpublish,
    dict.editor.quality,
    dict.editor.focusMode,
    dict.editor.focusModeExit,
    focusMode,
    isPublished,
    locale,
    selectedSectionId,
    website.id,
  ]);

  useEffect(() => {
    function onUndo() {
      undo();
    }
    function onRedo() {
      redo();
    }
    function onSave() {
      void save();
    }
    function onSection(event: Event) {
      const detail = (event as CustomEvent<{ id: string; action: SectionAction }>)
        .detail;
      if (!detail?.id || !detail.action) return;
      const current = configRef.current;
      let result = null;
      if (detail.action === "toggle") {
        result = commandToggleSection(current, detail.id);
      } else if (detail.action === "delete") {
        result = commandDeleteSection(current, detail.id);
      } else if (detail.action === "duplicate") {
        result = commandDuplicateSection(current, detail.id);
      } else if (detail.action === "move-up") {
        result = commandMoveSection(current, detail.id, "up");
      } else if (detail.action === "move-down") {
        result = commandMoveSection(current, detail.id, "down");
      }
      if (!result) return;
      applyConfig(result.config, result.label);
      if (result.selectedSectionId !== undefined) {
        setSelectedSectionId(result.selectedSectionId ?? undefined);
      }
    }
    function onAiRestyle(event: Event) {
      const direction =
        (event as CustomEvent<{ direction?: "editorial" }>).detail?.direction ??
        "editorial";
      const actions = proposeEditorActions(configRef.current, {
        intent: "restyle",
        direction,
      });
      let next = configRef.current;
      for (const action of actions) {
        const applied = applyEditorAction(next, action);
        if (applied.ok) next = applied.result.config;
      }
      applyConfig(next, `AI restyle ${direction}`);
    }
    window.addEventListener("vitrin-editor-undo", onUndo);
    window.addEventListener("vitrin-editor-redo", onRedo);
    window.addEventListener("vitrin-editor-save", onSave);
    window.addEventListener("vitrin-editor-section", onSection);
    window.addEventListener("vitrin-editor-ai-restyle", onAiRestyle);
    return () => {
      window.removeEventListener("vitrin-editor-undo", onUndo);
      window.removeEventListener("vitrin-editor-redo", onRedo);
      window.removeEventListener("vitrin-editor-save", onSave);
      window.removeEventListener("vitrin-editor-section", onSection);
      window.removeEventListener("vitrin-editor-ai-restyle", onAiRestyle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvas = (
    <EditorEditProvider
      enabled
      mode="editor"
      selected={selectedField}
      selectedSectionId={selectedSectionId}
      hoveredSectionId={hoveredSectionId}
      config={config}
      onChange={applyConfig}
      onSelect={(path) => selectField(path)}
      onSelectSection={(id) => selectSection(id)}
      onHoverSection={setHoveredSectionId}
      onSectionAction={handleSectionAction}
    >
      <WebsiteRenderer
        config={config}
        mode="editor"
        basePath={`/${locale}/preview/${website.id}`}
        productSlug={canvasProduct ?? undefined}
        onProductNavigate={(slug) => {
          setCanvasProduct(slug);
          setActivePage("product");
          setPhonePane("inspector");
          setTabletInspectorOpen(true);
        }}
        onHomeNavigate={() => {
          setCanvasProduct(null);
          setActivePage("home");
        }}
      />
    </EditorEditProvider>
  );

  const inspector = (
    <EditorInspector
      config={config}
      dict={dict}
      locale={locale}
      websiteId={website.id}
      canRemoveBranding={canRemoveBranding}
      selectedSectionId={selectedSectionId}
      selectedField={selectedField}
      activePage={activePage}
      productSlug={canvasProduct}
      compactChrome
      sectionTab={sectionTab}
      siteGroup={siteGroup}
      onSectionTabChange={setSectionTab}
      onSiteGroupChange={setSiteGroup}
      onChange={applyConfig}
      onRestored={handleRestored}
      onOpenSections={() => {
        setPhonePane("sections");
        setLeftNav("sections");
        setTabletInspectorOpen(false);
      }}
    />
  );

  const inspectorDesktop = (
    <EditorInspector
      config={config}
      dict={dict}
      locale={locale}
      websiteId={website.id}
      canRemoveBranding={canRemoveBranding}
      selectedSectionId={selectedSectionId}
      selectedField={selectedField}
      activePage={activePage}
      productSlug={canvasProduct}
      sectionTab={sectionTab}
      siteGroup={siteGroup}
      onSectionTabChange={setSectionTab}
      onSiteGroupChange={setSiteGroup}
      onChange={applyConfig}
      onRestored={handleRestored}
      onOpenSections={() => setLeftNav("sections")}
    />
  );

  const sidebar = (
    <EditorSidebar
      config={config}
      dict={dict}
      locale={locale}
      nav={leftNav}
      selectedSectionId={selectedSectionId}
      selectedField={selectedField}
      activePage={activePage}
      onNavChange={setLeftNav}
      onSelectSection={(id) => {
        selectSection(id);
      }}
      onSelectField={(path, sectionId) => selectField(path, sectionId)}
      onChange={applyConfig}
      onAddSection={() => setLibraryOpen(true)}
      onPageChange={(page) => {
        onPageChange(page);
        if (page === "product") {
          setPhonePane("inspector");
          setTabletInspectorOpen(true);
        } else {
          setPhonePane("canvas");
        }
      }}
    />
  );

  return (
    <div className="editor-shell relative flex h-dvh flex-col overflow-hidden">
      {/* ── Phone header ── */}
      <header className="editor-mobile-header relative z-30 flex h-12 shrink-0 items-center gap-2 px-3 md:hidden">
        <Link
          href={`/${locale}/dashboard/website?id=${website.id}`}
          className="editor-icon-btn shrink-0"
          aria-label={dict.editor.back}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium tracking-[-0.01em]">
            {config.brand.name}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                savePhase === "error"
                  ? "bg-red-400"
                  : dirty
                    ? "bg-amber-400"
                    : "bg-emerald-400/90",
              )}
            />
            <p
              className={cn(
                "truncate text-[10px]",
                savePhase === "error"
                  ? "text-red-300"
                  : dirty
                    ? "text-amber-200/90"
                    : "text-[color:var(--ed-muted)]",
              )}
            >
              {saveLabel}
            </p>
          </div>
        </div>
        {savePhase === "error" ? (
          <button
            type="button"
            onClick={() => void save()}
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] text-[color:var(--ed-accent)]"
          >
            {dict.editor.retrySave}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setPublishError(null);
            setPublishOpen(true);
          }}
          disabled={publishing}
          className="editor-publish-btn shrink-0"
        >
          {isPublished ? dict.editor.unpublish : dict.editor.publish}
        </button>
      </header>

      <EditorTopBar
        locale={locale}
        websiteId={website.id}
        websiteSlug={website.slug}
        brandName={config.brand.name}
        isPublished={isPublished}
        dirty={dirty}
        saveLabel={saveLabel}
        saveError={savePhase === "error"}
        canUndo={canUndo}
        canRedo={canRedo}
        viewport={viewport}
        publishing={publishing}
        publishLabel={isPublished ? dict.editor.unpublish : dict.editor.publish}
        previewLabel={dict.editor.preview}
        liveLabel={dict.editor.live}
        backLabel={dict.editor.back}
        focusMode={focusMode}
        focusLabel={
          focusMode ? dict.editor.focusModeExit : dict.editor.focusMode
        }
        qualityLabel={dict.editor.quality}
        onUndo={undo}
        onRedo={redo}
        onRetrySave={() => void save()}
        onViewportChange={setViewport}
        onHistory={() => setHistoryOpen(true)}
        onQuality={() => setQualityOpen(true)}
        onCommandPalette={() => setCommandOpen(true)}
        onToggleFocus={() => setFocusMode((v) => !v)}
        onPublish={() => {
          setPublishError(null);
          setPublishOpen(true);
        }}
      />

      {flash ? (
        <div className="pointer-events-none absolute start-1/2 top-14 z-50 -translate-x-1/2 rounded-full border border-[color:var(--ed-border)] bg-[color:var(--ed-bg-elevated)] px-3 py-1.5 text-[11px] text-[color:var(--ed-fg)] shadow-lg">
          {flash}
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Tablet/desktop left sidebar */}
        <aside
          className={cn(
            "editor-panel hidden w-[240px] shrink-0 flex-col border-e border-[color:var(--ed-border)] bg-[color:var(--ed-bg)] lg:w-[280px]",
            !focusMode && "md:flex",
          )}
        >
          {sidebar}
        </aside>

        {/* Phone: sections pane (full screen, exclusive) */}
        <div
          className={cn(
            "min-h-0 flex-1 flex-col bg-[color:var(--ed-bg)] md:hidden",
            phonePane === "sections" ? "flex" : "hidden",
          )}
        >
          <EditorPaneHeader
            title={dict.editor.panelSections}
            onClose={() => setPhonePane("canvas")}
          />
          <div className="min-h-0 flex-1 overflow-hidden">{sidebar}</div>
        </div>

        {/* Phone: inspector pane (full screen, exclusive) */}
        <div
          className={cn(
            "min-h-0 flex-1 flex-col bg-[color:var(--ed-bg)] md:hidden",
            phonePane === "inspector" ? "flex" : "hidden",
          )}
        >
          <EditorPaneHeader
            title={inspectorTitle}
            onClose={() => setPhonePane("canvas")}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">{inspector}</div>
        </div>

        {/* Canvas */}
        <main
          className={cn(
            "editor-canvas-stage relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            phonePane === "canvas" ? "flex" : "hidden md:flex",
          )}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("[data-editor-section]")) {
              return;
            }
            if (
              (event.target as HTMLElement).closest("[contenteditable='true']")
            ) {
              return;
            }
            setSelectedSectionId(undefined);
            setSelectedField(undefined);
          }}
        >
          <div className="md:hidden">
            <EditorViewportBar
              device={device}
              labels={{
                desktop: dict.editor.desktop,
                tablet: dict.editor.tablet,
                mobile: dict.editor.mobile,
              }}
              onChange={(next) => setViewport(viewportFromDevice(next))}
            />
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto">
            <div className="editor-canvas-dotgrid pointer-events-none absolute inset-0" />
            <div className="relative min-h-full">
              <EditorCanvasFrame viewport={viewport} brandName={config.brand.name}>
                {canvas}
              </EditorCanvasFrame>
            </div>
          </div>
        </main>

        {/* Desktop inspector */}
        <aside
          className={cn(
            "editor-panel hidden w-[320px] shrink-0 flex-col border-s border-[color:var(--ed-border)] bg-[color:var(--ed-bg)] xl:w-[340px]",
            !focusMode && "lg:flex",
          )}
        >
          {inspectorDesktop}
        </aside>

        {/* Tablet inspector overlay — clean end panel */}
        {tabletInspectorOpen && !focusMode ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-40 bg-black/40 max-md:hidden lg:hidden"
              aria-label="Close"
              onClick={() => setTabletInspectorOpen(false)}
            />
            <div className="editor-panel absolute inset-y-0 end-0 z-50 hidden w-[min(100%,360px)] flex-col border-s border-[color:var(--ed-border)] bg-[color:var(--ed-bg-elevated)] shadow-2xl md:flex lg:hidden">
              <EditorPaneHeader
                title={inspectorTitle}
                onClose={() => setTabletInspectorOpen(false)}
              />
              <div className="min-h-0 flex-1 overflow-y-auto">{inspector}</div>
            </div>
          </>
        ) : null}
      </div>

      {/* Phone tab bar — only 3 clear modes */}
      <div className="md:hidden">
        <EditorPhoneTabBar
          active={phonePane}
          labels={{
            canvas: dict.editor.canvasTab,
            sections: dict.editor.panelSections,
            inspector: dict.editor.inspectorTab,
          }}
          onChange={(tab) => {
            if (tab === "inspector" && !selectedSectionId && activePage !== "product") {
              const first =
                config.sections.find((s) => s.visible) ?? config.sections[0];
              if (first) setSelectedSectionId(first.id);
            }
            setPhonePane(tab);
          }}
        />
      </div>

      <SectionLibrary
        open={libraryOpen}
        locale={locale}
        dict={dict}
        vertical={config.settings.vertical}
        existingTypes={new Set(config.sections.map((s) => s.type))}
        onClose={() => setLibraryOpen(false)}
        onAdd={(type) => {
          const result = commandAddSection(config, type);
          if (!result) return;
          applyConfig(result.config, result.label);
          const added = result.config.sections.find(
            (s) => s.type === type && s.visible,
          );
          if (added) {
            setSelectedSectionId(added.id);
            setPhonePane("inspector");
            setTabletInspectorOpen(true);
          }
          setLeftNav("sections");
        }}
      />

      <PublishDialog
        open={publishOpen}
        dict={dict}
        locale={locale}
        isPublished={isPublished}
        changes={publishChanges}
        publishing={publishing}
        error={publishError}
        preflight={runPublishPreflight(config)}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => void confirmPublish()}
      />

      <EditorCommandPalette
        open={commandOpen}
        locale={locale}
        onClose={() => setCommandOpen(false)}
        commands={commandItems}
      />

      <HistoryPanel
        open={historyOpen}
        locale={locale}
        entries={history}
        index={historyIndex}
        onClose={() => setHistoryOpen(false)}
        onRestore={restoreHistory}
      />

      <QualityPanel
        open={qualityOpen}
        locale={locale}
        score={scoreWebsiteQuality(config)}
        onClose={() => setQualityOpen(false)}
      />
    </div>
  );
}
