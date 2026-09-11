"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { WebsiteConfig, WebsiteRecord } from "@/types/website";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import {
  cloneConfig,
  configsEqual,
  editorTabs,
  type EditorTab,
} from "@/components/editor/editor-utils";
import { polishWebsiteConfig } from "@/lib/website/polish";
import {
  BrandPanel,
  ColorsPanel,
  LayoutPanel,
  TypographyPanel,
} from "@/components/editor/EditorPanels";
import { ContentPanel, SectionsPanel } from "@/components/editor/ContentSections";
import {
  DomainPanel,
  MediaPanel,
  SeoPanel,
  SettingsPanel,
  TemplatePanel,
  VersionsPanel,
} from "@/components/editor/ExtraPanels";
import {
  EditorEditProvider,
  type EditorFieldPath,
} from "@/components/editor/EditContext";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Monitor,
  PanelLeft,
  Redo2,
  Save,
  Smartphone,
  Undo2,
} from "lucide-react";

const HISTORY_LIMIT = 40;

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
  const searchParams = useSearchParams();
  const tabs = editorTabs(dict);
  const canRemoveBranding = plan === "pro";
  const canCustomDomain = plan === "pro";

  const [config, setConfig] = useState<WebsiteConfig>(() =>
    polishWebsiteConfig(cloneConfig(website.config)),
  );
  const [savedConfig, setSavedConfig] = useState<WebsiteConfig>(() =>
    polishWebsiteConfig(cloneConfig(website.config)),
  );
  const [history, setHistory] = useState<WebsiteConfig[]>(() => [
    polishWebsiteConfig(cloneConfig(website.config)),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<EditorTab>(
    initialTab && tabs.some((t) => t.id === initialTab)
      ? (initialTab as EditorTab)
      : "brand",
  );
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [panelOpen, setPanelOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState(website.status);
  const [slug, setSlug] = useState(website.slug);
  const [selectedField, setSelectedField] = useState<EditorFieldPath | undefined>();
  const [flash, setFlash] = useState<string | null>(null);
  const [canvasProduct, setCanvasProduct] = useState<string | null>(null);
  const skipHistory = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(0);

  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const dirty = !configsEqual(config, savedConfig);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isPublished = status === "published";

  function flashMessage(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 1800);
  }

  function commitHistory(snapshot: WebsiteConfig) {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const base = historyRef.current.slice(0, historyIndexRef.current + 1);
    const last = base[base.length - 1];
    if (last && configsEqual(last, snapshot)) return;
    const merged = [...base, cloneConfig(snapshot)].slice(-HISTORY_LIMIT);
    historyRef.current = merged;
    historyIndexRef.current = merged.length - 1;
    setHistory(merged);
    setHistoryIndex(merged.length - 1);
  }

  function applyConfig(next: WebsiteConfig) {
    setConfig(next);
    if (skipHistory.current) {
      skipHistory.current = false;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      commitHistory(next);
    }, 320);
  }

  function undo() {
    if (debounceRef.current) {
      commitHistory(config);
    }
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    skipHistory.current = true;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setConfig(cloneConfig(historyRef.current[nextIndex]!));
  }

  function redo() {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    skipHistory.current = true;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setConfig(cloneConfig(historyRef.current[nextIndex]!));
  }

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (event.key === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (event.key === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history, config, dirty]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) {
        flashMessage(dict.editor.saveFailed);
        return;
      }
      setSavedConfig(cloneConfig(config));
      flashMessage(dict.editor.saved);
      router.refresh();
    } catch {
      flashMessage(dict.editor.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      if (dirty) {
        const saveResponse = await fetch(`/api/websites/${website.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config }),
        });
        if (!saveResponse.ok) {
          flashMessage(dict.editor.saveFailed);
          return;
        }
        setSavedConfig(cloneConfig(config));
      }
      const nextPublished = !isPublished;
      const response = await fetch(`/api/websites/${website.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      if (!response.ok) {
        flashMessage(dict.editor.saveFailed);
        return;
      }
      setStatus(nextPublished ? "published" : "unpublished");
      flashMessage(
        nextPublished ? dict.editor.published : dict.editor.unpublished,
      );
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F4F4F2] text-ink">
      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/8 bg-white/90 px-3 backdrop-blur-md md:px-5">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
          title={dict.editor.brand}
        >
          <PanelLeft size={15} />
        </button>

        <Link
          href={`/${locale}/dashboard/website?id=${website.id}`}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">{dict.editor.back}</span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium tracking-tight">
              {config.brand.name}
            </p>
            <span
              className={cn(
                "hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline",
                dirty
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-800",
              )}
            >
              {dirty ? dict.editor.dirty : dict.editor.clean}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full transition",
              device === "desktop"
                ? "bg-white text-ink shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={dict.editor.desktop}
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full transition",
              device === "mobile"
                ? "bg-white text-ink shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            title={dict.editor.mobile}
          >
            <Smartphone size={15} />
          </button>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
            title={dict.editor.undo}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
            title={dict.editor.redo}
          >
            <Redo2 size={15} />
          </button>
        </div>

        <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
          <Link href={`/${locale}/preview/${website.id}`} target="_blank">
            <ExternalLink size={14} className="me-1.5" />
            {dict.editor.preview}
          </Link>
        </Button>

        {isPublished ? (
          <Button variant="ghost" size="sm" asChild className="hidden lg:inline-flex">
            <a href={`/s/${slug}`} target="_blank" rel="noreferrer">
              {dict.editor.live}
            </a>
          </Button>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void save()}
          disabled={saving || !dirty}
          className="gap-1.5"
        >
          {saving ? (
            dict.editor.saving
          ) : flash === dict.editor.saved ? (
            <>
              <Check size={14} />
              {dict.editor.saved}
            </>
          ) : (
            <>
              <Save size={14} />
              {dict.editor.save}
            </>
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={() => void togglePublish()}
          disabled={publishing}
          className="gap-1.5"
        >
          {publishing
            ? "…"
            : isPublished
              ? dict.editor.unpublish
              : dict.editor.publish}
        </Button>

        {flash && flash !== dict.editor.saved ? (
          <div className="pointer-events-none absolute start-1/2 top-[calc(100%+8px)] -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-[11px] text-white shadow-lg">
            {flash}
          </div>
        ) : null}
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={cn(
            "z-20 flex w-[min(100%,380px)] flex-col border-e border-black/8 bg-white shadow-xl lg:relative lg:z-0 lg:shadow-none",
            panelOpen
              ? "absolute inset-y-0 start-0 lg:static"
              : "hidden lg:flex",
          )}
        >
          <div className="flex gap-1 overflow-x-auto border-b border-black/6 px-3 py-2.5">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition",
                  tab === item.id
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            {tab === "brand" ? (
              <BrandPanel config={config} dict={dict} onChange={applyConfig} />
            ) : null}
            {tab === "colors" ? (
              <ColorsPanel
                config={config}
                dict={dict}
                locale={locale}
                onChange={applyConfig}
              />
            ) : null}
            {tab === "type" ? (
              <TypographyPanel
                config={config}
                dict={dict}
                onChange={applyConfig}
              />
            ) : null}
            {tab === "layout" ? (
              <LayoutPanel
                config={config}
                dict={dict}
                onChange={applyConfig}
              />
            ) : null}
            {tab === "content" ? (
              <ContentPanel
                config={config}
                dict={dict}
                onChange={applyConfig}
              />
            ) : null}
            {tab === "media" ? (
              <MediaPanel config={config} dict={dict} onChange={applyConfig} />
            ) : null}
            {tab === "sections" ? (
              <SectionsPanel
                config={config}
                dict={dict}
                locale={locale}
                onChange={applyConfig}
              />
            ) : null}
            {tab === "seo" ? (
              <SeoPanel config={config} dict={dict} onChange={applyConfig} />
            ) : null}
            {tab === "settings" ? (
              <SettingsPanel
                config={config}
                dict={dict}
                onChange={applyConfig}
                canRemoveBranding={canRemoveBranding}
              />
            ) : null}
            {tab === "template" ? (
              <TemplatePanel
                config={config}
                dict={dict}
                locale={locale}
                onChange={applyConfig}
              />
            ) : null}
            {tab === "versions" ? (
              <VersionsPanel
                websiteId={website.id}
                dict={dict}
                onRestored={(next) => {
                  const cloned = cloneConfig(next);
                  setConfig(cloned);
                  setSavedConfig(cloneConfig(next));
                  historyRef.current = [cloned];
                  historyIndexRef.current = 0;
                  setHistory([cloned]);
                  setHistoryIndex(0);
                  flashMessage(dict.editor.restored);
                  router.refresh();
                }}
              />
            ) : null}
            {tab === "domain" ? (
              <DomainPanel
                websiteId={website.id}
                initialSlug={slug}
                dict={dict}
                canCustomDomain={canCustomDomain}
                onFlash={flashMessage}
                onSlugChange={setSlug}
              />
            ) : null}
          </div>
        </aside>

        {panelOpen ? (
          <button
            type="button"
            className="absolute inset-0 z-10 bg-black/20 lg:hidden"
            aria-label="Close panel"
            onClick={() => setPanelOpen(false)}
          />
        ) : null}

        <main className="relative min-w-0 flex-1 overflow-auto">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="relative flex min-h-full justify-center p-4 md:p-8">
            <div
              className={cn(
                "w-full overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] transition-[max-width] duration-300",
                device === "mobile" ? "max-w-[390px]" : "max-w-[1120px]",
              )}
            >
              <div className="flex h-9 items-center gap-1.5 border-b border-black/6 bg-[#FAFAF8] px-3">
                <span className="size-2 rounded-full bg-[#FF5F57]" />
                <span className="size-2 rounded-full bg-[#FEBC2E]" />
                <span className="size-2 rounded-full bg-[#28C840]" />
                <span className="ms-3 truncate text-[10px] text-muted-foreground">
                  {config.brand.name}
                </span>
              </div>
              <div
                className={cn(
                  "vitrin-editor-canvas origin-top transition-transform",
                  device === "mobile" ? "scale-[0.98]" : "",
                )}
              >
                <EditorEditProvider
                  enabled
                  selected={selectedField}
                  config={config}
                  onChange={applyConfig}
                  onSelect={(path) => {
                    setSelectedField(path);
                    setTab("content");
                  }}
                >
                  <WebsiteRenderer
                    config={config}
                    basePath={`/${locale}/preview/${website.id}`}
                    productSlug={canvasProduct ?? undefined}
                    onProductNavigate={(slug) => setCanvasProduct(slug)}
                    onHomeNavigate={() => setCanvasProduct(null)}
                  />
                </EditorEditProvider>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
