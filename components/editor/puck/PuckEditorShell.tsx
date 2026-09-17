"use client";

/**
 * Puck editor shell — uses Puck's native demo layout (blocks / outline / fields)
 * plus Classic product surfaces via overrides. Classic EditorShell stays intact.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Puck, usePuck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "@/app/puck-editor.css";
import type {
  WebsiteConfig,
  WebsiteRecord,
  WebsiteSectionType,
} from "@/types/website";
import type { Locale } from "@/lib/config/env";
import {
  buildPuckConfig,
  puckToWebsiteConfig,
  websiteConfigToPuck,
  type PuckWebsiteData,
} from "@/lib/puck";
import { PuckWebsiteProvider } from "@/lib/puck/website-context";
import { StoreCartProvider } from "@/lib/store/cart";
import type { PuckSaveState } from "@/components/editor/puck/PuckTopBar";
import type { AiProposal } from "@/components/editor/puck/PuckAiBar";
import {
  PuckAiPanelProvider,
  createPuckAiPlugin,
} from "@/components/editor/puck/PuckAiPlugin";
import {
  PuckEditBridge,
  addSectionAfter,
} from "@/components/editor/puck/PuckEditBridge";
import { PuckHeaderActions } from "@/components/editor/puck/PuckHeaderActions";
import { PuckFieldsPanel } from "@/components/editor/puck/PuckFieldsPanel";
import { PuckResponsiveChrome } from "@/components/editor/puck/PuckResponsiveChrome";
import { PublishDialog } from "@/components/editor/PublishDialog";
import { HistoryPanel } from "@/components/editor/HistoryPanel";
import { QualityPanel } from "@/components/editor/QualityPanel";
import { SectionLibrary } from "@/components/editor/SectionLibrary";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import {
  EDITOR_HISTORY_LIMIT,
  createHistoryEntry,
  pushHistory,
  shouldDebounceHistoryLabel,
  executeAiActionBatch,
  runPublishPreflight,
  scoreWebsiteQuality,
  type HistoryEntry,
} from "@/lib/editor";
import { assertProposalFresh } from "@/lib/editor/ai/freshness";
import { getDictionary } from "@/lib/i18n/dictionary";

ensureStoreSectionRenderersBound();

/** ⌘K opens the AI plugin in the left sidebar. */
function PuckAiHotkey() {
  const { dispatch } = usePuck();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      dispatch({
        type: "setUi",
        ui: {
          plugin: { current: "ai" },
          leftSideBarVisible: true,
        },
      });
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(
          "[data-puck-ai-bar] textarea, [data-puck-ai-bar] input",
        );
        el?.focus();
      }, 50);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
  return null;
}

const AUTOSAVE_MS = 900;
const HISTORY_DEBOUNCE_MS = 450;

export function PuckEditorShell({
  website,
  locale,
  plan,
}: {
  website: WebsiteRecord;
  locale: Locale;
  plan?: string;
}) {
  const isFa = locale === "fa";
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const canRemoveBranding = plan === "pro" || plan === "business";

  const [config, setConfig] = useState(website.config);
  const [version, setVersion] = useState(website.version);
  const [status, setStatus] = useState(website.status);
  const [puckData, setPuckData] = useState<PuckWebsiteData>(() =>
    websiteConfigToPuck(website.config),
  );
  const [saveState, setSaveState] = useState<PuckSaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryInsertAfterId, setLibraryInsertAfterId] = useState<
    string | null
  >(null);

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => [
    createHistoryEntry(website.config, "Initial"),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [localRevision, setLocalRevision] = useState(0);
  const localRevisionRef = useRef(0);

  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHistoryLabel = useRef("Edit");
  const savingRef = useRef(false);
  const configRef = useRef(config);
  const versionRef = useRef(version);
  const historyEntriesRef = useRef(historyEntries);
  const historyIndexRef = useRef(historyIndex);
  const suppressPuckEcho = useRef(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    versionRef.current = version;
  }, [version]);
  useEffect(() => {
    historyEntriesRef.current = historyEntries;
  }, [historyEntries]);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const puckConfig = useMemo(() => {
    const base = buildPuckConfig({
      vertical: config.settings.vertical,
      locale,
    });
    const known = new Set(Object.keys(base.components ?? {}));
    const extras = [
      ...new Set(
        config.sections.map((s) => s.type).filter((t) => !known.has(t)),
      ),
    ];
    if (extras.length === 0) return base;
    return buildPuckConfig({
      vertical: config.settings.vertical,
      locale,
      extraSectionTypes: extras,
    });
  }, [config.settings.vertical, config.sections, locale]);

  const preflight = useMemo(() => runPublishPreflight(config), [config]);
  const quality = useMemo(() => scoreWebsiteQuality(config), [config]);
  const isPublished = status === "published";

  const persist = useCallback(async () => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaveState("saving");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/websites/${website.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: configRef.current,
          expectedVersion: versionRef.current,
        }),
      });
      if (res.status === 409) {
        setSaveState("error");
        setErrorMessage(
          isFa
            ? "تغییرات جای دیگری اعمال شده. صفحه را بارگذاری مجدد کن."
            : "Changes were made elsewhere. Reload and try again.",
        );
        dirtyRef.current = true;
        return false;
      }
      if (!res.ok) {
        setSaveState("error");
        setErrorMessage(isFa ? "ذخیره ناموفق بود." : "Save failed.");
        dirtyRef.current = true;
        return false;
      }
      const body = (await res.json()) as { version?: number };
      if (typeof body.version === "number") {
        setVersion(body.version);
        versionRef.current = body.version;
      }
      dirtyRef.current = false;
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      setErrorMessage(
        isFa ? "خطای شبکه هنگام ذخیره." : "Network error while saving.",
      );
      dirtyRef.current = true;
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [website.id, isFa]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist();
    }, AUTOSAVE_MS);
  }, [persist]);

  const commitHistory = useCallback((snapshot: WebsiteConfig, label: string) => {
    if (historyDebounce.current) {
      clearTimeout(historyDebounce.current);
      historyDebounce.current = null;
    }
    const pushed = pushHistory({
      entries: historyEntriesRef.current,
      index: historyIndexRef.current,
      next: snapshot,
      label,
      limit: EDITOR_HISTORY_LIMIT,
    });
    historyEntriesRef.current = pushed.entries;
    historyIndexRef.current = pushed.index;
    setHistoryEntries(pushed.entries);
    setHistoryIndex(pushed.index);
  }, []);

  const syncPuckFromConfig = useCallback((next: WebsiteConfig) => {
    suppressPuckEcho.current = true;
    setPuckData(websiteConfigToPuck(next));
    queueMicrotask(() => {
      suppressPuckEcho.current = false;
    });
  }, []);

  const applyConfig = useCallback(
    (next: WebsiteConfig, label = "Edit") => {
      const bumpRevision = () => {
        localRevisionRef.current += 1;
        setLocalRevision(localRevisionRef.current);
      };

      if (!shouldDebounceHistoryLabel(label)) {
        if (historyDebounce.current) {
          clearTimeout(historyDebounce.current);
          historyDebounce.current = null;
          commitHistory(configRef.current, pendingHistoryLabel.current);
        }
        setConfig(next);
        configRef.current = next;
        syncPuckFromConfig(next);
        scheduleSave();
        commitHistory(next, label);
        bumpRevision();
        return;
      }

      setConfig(next);
      configRef.current = next;
      syncPuckFromConfig(next);
      scheduleSave();
      bumpRevision();
      pendingHistoryLabel.current = label;
      if (historyDebounce.current) clearTimeout(historyDebounce.current);
      historyDebounce.current = setTimeout(() => {
        historyDebounce.current = null;
        commitHistory(configRef.current, pendingHistoryLabel.current);
      }, HISTORY_DEBOUNCE_MS);
    },
    [commitHistory, scheduleSave, syncPuckFromConfig],
  );

  const handleConfigChange = useCallback(
    (next: WebsiteConfig, label?: string) => {
      applyConfig(next, label ?? "Edit");
    },
    [applyConfig],
  );

  useEffect(() => {
    const onPageHide = () => {
      if (!dirtyRef.current) return;
      void fetch(`/api/websites/${website.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: configRef.current,
          expectedVersion: versionRef.current,
        }),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (historyDebounce.current) clearTimeout(historyDebounce.current);
    };
  }, [website.id]);

  const handlePuckChange = useCallback(
    (data: PuckWebsiteData) => {
      if (suppressPuckEcho.current) {
        setPuckData(data);
        return;
      }
      setPuckData(data);
      const next = puckToWebsiteConfig(data, configRef.current);
      applyConfig(next, "Layout");
    },
    [applyConfig],
  );

  const handleApplyAiProposal = useCallback(
    (proposal: AiProposal) => {
      const fresh = assertProposalFresh({
        proposal: {
          baseVersion: proposal.baseVersion,
          localRevision: proposal.localRevision,
        },
        currentLocalRevision: localRevisionRef.current,
        currentServerVersion: versionRef.current,
      });
      if (!fresh.ok) {
        return {
          ok: false as const,
          reason:
            fresh.code === "STALE_PROPOSAL"
              ? ("stale" as const)
              : ("error" as const),
          message: fresh.messageFa,
        };
      }

      const executed = executeAiActionBatch({
        config: configRef.current,
        actions: proposal.actions,
        label: `AI Edit: ${proposal.summary}`,
      });
      if (!executed.ok) {
        return { ok: false as const, reason: "rejected" as const };
      }
      applyConfig(executed.config, executed.label);
      return { ok: true as const };
    },
    [applyConfig],
  );

  const confirmPublish = useCallback(async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      if (dirtyRef.current) {
        const ok = await persist();
        if (!ok) {
          setPublishError(isFa ? "ذخیره ناموفق بود." : "Save failed.");
          return;
        }
      }
      const nextPublished = !isPublished;
      const res = await fetch(`/api/websites/${website.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
          messageFa?: string;
        } | null;
        setPublishError(
          (isFa ? body?.messageFa : body?.message) ??
            (isFa ? "انتشار ناموفق بود." : "Publish failed."),
        );
        return;
      }
      setStatus(nextPublished ? "published" : "unpublished");
      setPublishOpen(false);
    } catch {
      setPublishError(isFa ? "خطا در انتشار." : "Publish error.");
    } finally {
      setPublishing(false);
    }
  }, [website.id, persist, isFa, isPublished]);

  const existingTypes = useMemo(
    () => new Set(config.sections.map((s) => s.type)),
    [config.sections],
  );

  const aiPlugin = useMemo(
    () => createPuckAiPlugin(isFa ? "هوش مصنوعی" : "AI"),
    [isFa],
  );

  const aiPanelValue = useMemo(
    () => ({
      locale,
      websiteId: website.id,
      config,
      version,
      localRevision,
      onApplyProposal: handleApplyAiProposal,
    }),
    [
      locale,
      website.id,
      config,
      version,
      localRevision,
      handleApplyAiProposal,
    ],
  );

  const dir = config.settings.direction === "rtl" ? "rtl" : "ltr";
  const canvasLang = config.settings.language === "en" ? "en" : "fa";
  const cartStorageKey = `vitrin-cart-editor:${website.id}`;

  return (
    <div
      className="puck-editor-shell h-dvh"
      dir="ltr"
      lang={canvasLang}
    >
      <PuckAiPanelProvider value={aiPanelValue}>
        <Puck
          config={puckConfig}
          data={puckData}
          onChange={handlePuckChange}
          height="100%"
          headerTitle={config.brand.name || website.slug}
          headerPath={`/${website.slug}`}
          plugins={[aiPlugin]}
          viewports={[
            {
              width: 360,
              height: "auto",
              label: isFa ? "کوچک" : "Small",
              icon: "Smartphone",
            },
            {
              width: 768,
              height: "auto",
              label: isFa ? "متوسط" : "Medium",
              icon: "Tablet",
            },
            {
              width: 1280,
              height: "auto",
              label: isFa ? "بزرگ" : "Large",
              icon: "Monitor",
            },
            {
              width: "100%",
              height: "auto",
              label: isFa ? "تمام‌عرض" : "Full-width",
              icon: "FullWidth",
            },
          ]}
          iframe={{
            enabled: true,
            waitForStyles: true,
            // Copy host stylesheets so store/site CSS works in preview,
            // without our old height:!important hacks on every _Puck node.
            syncHostStyles: true,
          }}
          onPublish={() => {
            setPublishError(null);
            setPublishOpen(true);
          }}
          dictionary={
            isFa
              ? {
                  "header-publish": "انتشار",
                  "plugin-blocks": "بلوک‌ها",
                  "plugin-outline": "ساختار",
                  "plugin-fields": "فیلدها",
                }
              : undefined
          }
          dnd={{ behavior: "auto" }}
          overrides={{
            iframe: ({ children }) => (
              <PuckWebsiteProvider
                config={config}
                locale={locale}
                onSchemaFieldChange={(next, label) =>
                  handleConfigChange(next, label ?? "Edit field")
                }
              >
                <StoreCartProvider
                  storageKey={cartStorageKey}
                  persist={false}
                >
                  <PuckEditBridge
                    config={config}
                    onConfigChange={handleConfigChange}
                    onRequestInsert={(afterId) => {
                      setLibraryInsertAfterId(afterId);
                      setLibraryOpen(true);
                    }}
                  >
                    <div
                      className="vitrin-editor-canvas puck-preview-host min-h-full bg-white"
                      dir={dir}
                      lang={canvasLang}
                    >
                      {children}
                    </div>
                  </PuckEditBridge>
                </StoreCartProvider>
              </PuckWebsiteProvider>
            ),
            puck: ({ children }) => (
              <>
                <PuckAiHotkey />
                <PuckResponsiveChrome />
                <div className="puck-editor-shell__root flex h-full min-h-0 flex-col">
                  {errorMessage ? (
                    <div
                      role="alert"
                      className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800"
                    >
                      {errorMessage}
                    </div>
                  ) : null}
                  <div className="min-h-0 flex-1">{children}</div>
                </div>
              </>
            ),
            headerActions: ({ children }) => (
              <PuckHeaderActions
                locale={locale}
                websiteId={website.id}
                saveState={saveState}
                publishing={publishing}
                isPublished={isPublished}
                onSave={() => void persist()}
                onPublish={() => {
                  setPublishError(null);
                  setPublishOpen(true);
                }}
                onOpenHistory={() => setHistoryOpen(true)}
                onOpenQuality={() => setQualityOpen(true)}
              >
                {children}
              </PuckHeaderActions>
            ),
            fields: ({ children, isLoading }) => (
              <PuckFieldsPanel
                locale={locale}
                config={config}
                websiteId={website.id}
                onConfigChange={handleConfigChange}
                canRemoveBranding={canRemoveBranding}
                isLoading={isLoading}
              >
                {children}
              </PuckFieldsPanel>
            ),
          }}
        />
      </PuckAiPanelProvider>

      <PublishDialog
        open={publishOpen}
        dict={dict}
        locale={locale}
        isPublished={isPublished}
        changes={[]}
        publishing={publishing}
        error={publishError}
        preflight={preflight}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => void confirmPublish()}
      />

      <HistoryPanel
        open={historyOpen}
        locale={locale}
        entries={historyEntries}
        index={historyIndex}
        onClose={() => setHistoryOpen(false)}
        onRestore={(index) => {
          const entry = historyEntries[index];
          if (!entry) return;
          historyIndexRef.current = index;
          setHistoryIndex(index);
          setConfig(entry.config);
          configRef.current = entry.config;
          syncPuckFromConfig(entry.config);
          localRevisionRef.current += 1;
          setLocalRevision(localRevisionRef.current);
          scheduleSave();
          setHistoryOpen(false);
        }}
      />

      <QualityPanel
        open={qualityOpen}
        locale={locale}
        score={quality}
        onClose={() => setQualityOpen(false)}
      />

      <SectionLibrary
        open={libraryOpen}
        locale={locale}
        dict={dict}
        existingTypes={existingTypes}
        vertical={config.settings.vertical}
        onClose={() => setLibraryOpen(false)}
        onAdd={(type: WebsiteSectionType) => {
          const result = addSectionAfter(
            configRef.current,
            type,
            libraryInsertAfterId,
          );
          if (!result) return;
          applyConfig(result.config, result.label);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
