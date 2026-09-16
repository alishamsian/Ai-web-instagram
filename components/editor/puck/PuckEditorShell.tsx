"use client";

/**
 * Phase 3 — Puck editor shell with AI Co-Designer + unified WebsiteConfig history.
 * Classic EditorShell remains the default route and is NOT deleted.
 *
 * History ownership (Phase 3):
 * - Application stack (`lib/editor/history`) owns WebsiteConfig snapshots
 * - AI Apply = one labeled transaction ("AI Edit: …")
 * - Top bar / ⌘Z use this stack (not a fighting dual stack with Puck)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { WebsiteConfig, WebsiteRecord } from "@/types/website";
import type { Locale } from "@/lib/config/env";
import {
  buildPuckConfig,
  puckToWebsiteConfig,
  websiteConfigToPuck,
  type PuckWebsiteData,
} from "@/lib/puck";
import { PuckWebsiteProvider } from "@/lib/puck/website-context";
import { PuckTopBar, type PuckSaveState } from "@/components/editor/puck/PuckTopBar";
import { PuckLeftPanel } from "@/components/editor/puck/PuckLeftPanel";
import { PuckInspector } from "@/components/editor/puck/PuckInspector";
import { PuckAiBar, type AiProposal } from "@/components/editor/puck/PuckAiBar";
import { PuckKeyboardShortcuts } from "@/components/editor/puck/PuckKeyboardShortcuts";
import { PuckCanvasFrame } from "@/components/editor/puck/PuckCanvasFrame";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import {
  EDITOR_HISTORY_LIMIT,
  createHistoryEntry,
  pushHistory,
  undoHistory,
  redoHistory,
  shouldDebounceHistoryLabel,
  executeAiActionBatch,
  type HistoryEntry,
} from "@/lib/editor";
import { assertProposalFresh } from "@/lib/editor/ai/freshness";
import { cn } from "@/lib/utils";

ensureStoreSectionRenderersBound();

const AUTOSAVE_MS = 900;
const HISTORY_DEBOUNCE_MS = 450;

export function PuckEditorShell({
  website,
  locale,
}: {
  website: WebsiteRecord;
  locale: Locale;
  plan?: string;
}) {
  const isFa = locale === "fa";
  const [config, setConfig] = useState(website.config);
  const [version, setVersion] = useState(website.version);
  const [puckData, setPuckData] = useState<PuckWebsiteData>(() =>
    websiteConfigToPuck(website.config),
  );
  const [saveState, setSaveState] = useState<PuckSaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>(() => [
    createHistoryEntry(website.config, "Initial"),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  /** Increments on every WebsiteConfig mutation — used for AI proposal freshness. */
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

  const persist = useCallback(async () => {
    if (savingRef.current) return;
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
            ? "نسخه سایت تغییر کرده. صفحه را به‌روزرسانی کنید و دوباره تلاش کنید."
            : "The website changed while you were editing. Refresh and try again.",
        );
        dirtyRef.current = true;
        return;
      }
      if (!res.ok) {
        setSaveState("error");
        setErrorMessage(isFa ? "ذخیره ناموفق بود." : "Save failed.");
        dirtyRef.current = true;
        return;
      }
      const body = (await res.json()) as { version?: number };
      if (typeof body.version === "number") {
        setVersion(body.version);
        versionRef.current = body.version;
      }
      dirtyRef.current = false;
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setErrorMessage(
        isFa ? "خطای شبکه هنگام ذخیره." : "Network error while saving.",
      );
      dirtyRef.current = true;
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

  /**
   * Canonical mutator — all WebsiteConfig writes should go through here.
   */
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
    (next: WebsiteConfig) => {
      applyConfig(next, "Edit");
    },
    [applyConfig],
  );

  const handleUndo = useCallback(() => {
    const result = undoHistory({
      entries: historyEntriesRef.current,
      index: historyIndexRef.current,
    });
    if (!result.config) return;
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    setConfig(result.config);
    configRef.current = result.config;
    syncPuckFromConfig(result.config);
    localRevisionRef.current += 1;
    setLocalRevision(localRevisionRef.current);
    scheduleSave();
  }, [scheduleSave, syncPuckFromConfig]);

  const handleRedo = useCallback(() => {
    const result = redoHistory({
      entries: historyEntriesRef.current,
      index: historyIndexRef.current,
    });
    if (!result.config) return;
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    setConfig(result.config);
    configRef.current = result.config;
    syncPuckFromConfig(result.config);
    localRevisionRef.current += 1;
    setLocalRevision(localRevisionRef.current);
    scheduleSave();
  }, [scheduleSave, syncPuckFromConfig]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyEntries.length - 1;

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
      applyConfig(next, "Move Section");
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
          reason: fresh.code === "STALE_PROPOSAL" ? ("stale" as const) : ("error" as const),
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

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      if (dirtyRef.current) await persist();
      const res = await fetch(`/api/websites/${website.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      });
      if (!res.ok) {
        setErrorMessage(isFa ? "انتشار ناموفق بود." : "Publish failed.");
      }
    } catch {
      setErrorMessage(isFa ? "خطا در انتشار." : "Publish error.");
    } finally {
      setPublishing(false);
    }
  }, [website.id, persist, isFa]);

  const dir = config.settings.direction === "rtl" ? "rtl" : "ltr";

  return (
    <div
      className={cn("flex h-dvh flex-col bg-zinc-100 text-zinc-900")}
      dir={dir}
      lang={config.settings.language === "en" ? "en" : "fa"}
    >
      <PuckWebsiteProvider config={config} locale={locale}>
        <Puck
          config={puckConfig}
          data={puckData}
          onChange={handlePuckChange}
          height="100%"
          viewports={[
            { width: 1440, height: "auto", label: "Desktop" },
            { width: 768, height: "auto", label: "Tablet" },
            { width: 390, height: "auto", label: "Mobile" },
          ]}
          iframe={{ enabled: false }}
        >
          <PuckKeyboardShortcuts
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <div className="flex h-full min-h-0 flex-col">
            <PuckTopBar
              locale={locale}
              websiteId={website.id}
              brandName={config.brand.name}
              slug={website.slug}
              saveState={saveState}
              errorMessage={errorMessage}
              onSave={() => void persist()}
              onPublish={() => void handlePublish()}
              publishing={publishing}
              zoom={zoom}
              onZoomChange={setZoom}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
            {errorMessage ? (
              <div
                role="alert"
                className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800"
              >
                {errorMessage}
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1">
              <div className="hidden min-h-0 md:flex md:flex-1">
                <PuckLeftPanel
                  locale={locale}
                  config={config}
                  onConfigChange={handleConfigChange}
                />
                <main className="relative min-w-0 flex-1 overflow-hidden bg-zinc-200/60">
                  <div className="h-full overflow-auto p-4 md:p-6">
                    <PuckCanvasFrame zoom={zoom} />
                  </div>
                </main>
                <PuckInspector
                  locale={locale}
                  config={config}
                  onConfigChange={handleConfigChange}
                />
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center md:hidden">
                <p className="text-sm font-medium text-zinc-900">
                  {isFa
                    ? "ویرایشگر حرفه‌ای روی صفحه بزرگ‌تر کار می‌کند"
                    : "Professional editor needs a larger screen"}
                </p>
                <p className="max-w-sm text-xs text-zinc-500">
                  {isFa
                    ? "از تبلت افقی یا دسکتاپ استفاده کنید، یا ویرایشگر کلاسیک را باز کنید."
                    : "Use landscape tablet or desktop, or open the classic editor."}
                </p>
                <a
                  href={`/${locale}/editor/${website.id}`}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white"
                >
                  {isFa ? "باز کردن ویرایشگر کلاسیک" : "Open Classic Editor"}
                </a>
              </div>
            </div>
            <PuckAiBar
              locale={locale}
              websiteId={website.id}
              config={config}
              version={version}
              localRevision={localRevision}
              onApplyProposal={handleApplyAiProposal}
            />
          </div>
        </Puck>
      </PuckWebsiteProvider>
    </div>
  );
}
