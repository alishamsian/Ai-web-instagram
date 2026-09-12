"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WebsiteConfig, WebsiteRecord, WebsiteSectionType } from "@/types/website";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import {
  addOrShowSection,
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
import {
  ArrowLeft,
  ExternalLink,
  Monitor,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";

const HISTORY_LIMIT = 40;
const AUTOSAVE_MS = 900;

type Device = "desktop" | "tablet" | "mobile";
type PhonePane = "canvas" | "sections" | "inspector";

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
  const [history, setHistory] = useState<WebsiteConfig[]>(() => [
    polishWebsiteConfig(cloneConfig(website.config)),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [leftNav, setLeftNav] = useState<LeftNavTab>("sections");
  const [activePage, setActivePage] = useState("home");
  const [phonePane, setPhonePane] = useState<PhonePane>("canvas");
  const [tabletInspectorOpen, setTabletInspectorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
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
      if (phone.matches) setDevice("mobile");
    };
    apply();
    phone.addEventListener("change", apply);
    return () => phone.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

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
    if (debounceRef.current) commitHistory(config);
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
    const index = config.sections.findIndex((s) => s.id === sectionId);
    const section = config.sections[index];
    if (!section) return;

    if (action === "toggle") {
      applyConfig({
        ...config,
        sections: config.sections.map((s) =>
          s.id === sectionId ? { ...s, visible: !s.visible } : s,
        ),
      });
      return;
    }

    if (action === "delete") {
      applyConfig({
        ...config,
        sections: config.sections.filter((s) => s.id !== sectionId),
      });
      setSelectedSectionId(undefined);
      return;
    }

    if (action === "duplicate") {
      const copy = {
        ...section,
        id: `${section.type}-${Date.now().toString(36)}`,
      };
      const sections = [...config.sections];
      sections.splice(index + 1, 0, copy);
      applyConfig({ ...config, sections });
      setSelectedSectionId(copy.id);
      return;
    }

    if (action === "move-up" && index > 0) {
      const sections = [...config.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(index - 1, 0, item!);
      applyConfig({ ...config, sections });
      return;
    }

    if (action === "move-down" && index < config.sections.length - 1) {
      const sections = [...config.sections];
      const [item] = sections.splice(index, 1);
      sections.splice(index + 1, 0, item!);
      applyConfig({ ...config, sections });
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA";

      if (event.key === "Escape") {
        setSelectedSectionId(undefined);
        setSelectedField(undefined);
        setLibraryOpen(false);
        setPublishOpen(false);
        setPhonePane("canvas");
        setTabletInspectorOpen(false);
        return;
      }

      if (
        !typing &&
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedSectionId
      ) {
        event.preventDefault();
        handleSectionAction(selectedSectionId, "delete");
        return;
      }

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
      } else if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        window.open(`/${locale}/preview/${website.id}`, "_blank");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, history, config, dirty, selectedSectionId, locale, website.id]);

  function selectField(path: EditorFieldPath, sectionId?: string) {
    setSelectedField(path);
    const type = fieldToSectionType(path);
    const matched =
      sectionId ??
      (type
        ? config.sections.find((section) => section.type === type)?.id
        : undefined);
    if (matched) setSelectedSectionId(matched);
    setLeftNav("layers");
    setPhonePane("inspector");
    setTabletInspectorOpen(true);
  }

  function selectSection(id: string | undefined) {
    setSelectedSectionId(id);
    setSelectedField(undefined);
    if (id) {
      setActivePage((page) => (page === "product" ? "home" : page));
      if (canvasProduct) setCanvasProduct(null);
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
    setConfig(cloned);
    setSavedConfig(cloneConfig(next));
    savedConfigRef.current = cloneConfig(next);
    historyRef.current = [cloned];
    historyIndexRef.current = 0;
    setHistory([cloned]);
    setHistoryIndex(0);
    setSavedAt(Date.now());
    flashMessage(dict.editor.restored);
    router.refresh();
  }

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
      activePage={activePage}
      productSlug={canvasProduct}
      compactChrome
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
      activePage={activePage}
      productSlug={canvasProduct}
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
    <div className="flex h-dvh flex-col overflow-hidden bg-[#080808] text-[#F7F7F8]">
      {/* ── Phone header: minimal ── */}
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0D0D0F] px-3 md:hidden">
        <Link
          href={`/${locale}/dashboard/website?id=${website.id}`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#B5B5BC] hover:bg-white/[0.06]"
          aria-label={dict.editor.back}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium tracking-wide">
            {config.brand.name}
          </p>
          <p
            className={cn(
              "truncate text-[10px]",
              savePhase === "error"
                ? "text-red-300"
                : dirty
                  ? "text-amber-300"
                  : "text-[#77777F]",
            )}
          >
            {saveLabel}
          </p>
        </div>
        {savePhase === "error" ? (
          <button
            type="button"
            onClick={() => void save()}
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] text-[#FF6B57]"
          >
            {dict.editor.retrySave}
          </button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setPublishError(null);
            setPublishOpen(true);
          }}
          disabled={publishing}
          className="shrink-0 bg-[#FF6B57] px-3 text-white hover:bg-[#ff7d6c]"
        >
          {isPublished ? dict.editor.unpublish : dict.editor.publish}
        </Button>
      </header>

      {/* ── Desktop / tablet header ── */}
      <header className="relative z-30 hidden h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0D0D0F] px-4 md:flex">
        <Link
          href={`/${locale}/dashboard/website?id=${website.id}`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-[#B5B5BC] hover:bg-white/[0.06] hover:text-[#F7F7F8]"
        >
          <ArrowLeft size={15} />
          {dict.editor.back}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium tracking-[0.06em] uppercase">
            {config.brand.name}
          </p>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-1">
          {(
            [
              ["desktop", Monitor, dict.editor.desktop],
              ["tablet", Tablet, dict.editor.tablet],
              ["mobile", Smartphone, dict.editor.mobile],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => setDevice(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition",
                device === id
                  ? "bg-white/[0.1] text-[#F7F7F8]"
                  : "text-[#77777F] hover:text-[#B5B5BC]",
              )}
            >
              <Icon size={14} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>
        <IconButton label={`${dict.editor.undo} ⌘Z`} onClick={undo} disabled={!canUndo}>
          <Undo2 size={15} />
        </IconButton>
        <IconButton label={`${dict.editor.redo} ⌘⇧Z`} onClick={redo} disabled={!canRedo}>
          <Redo2 size={15} />
        </IconButton>
        <p
          className={cn(
            "text-[11px]",
            savePhase === "error"
              ? "text-red-300"
              : dirty
                ? "text-amber-300"
                : "text-[#77777F]",
          )}
        >
          {saveLabel}
        </p>
        {savePhase === "error" ? (
          <button
            type="button"
            onClick={() => void save()}
            className="rounded-md px-2 py-1 text-[11px] text-[#FF6B57] hover:bg-[#FF6B57]/10"
          >
            {dict.editor.retrySave}
          </button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[#B5B5BC] hover:bg-white/[0.06] hover:text-[#F7F7F8]"
        >
          <Link
            href={`/${locale}/preview/${website.id}`}
            target="_blank"
            title={`${dict.editor.preview} ⌘P`}
          >
            <ExternalLink size={14} className="me-1.5" />
            {dict.editor.preview}
          </Link>
        </Button>
        {isPublished ? (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-[#B5B5BC] hover:bg-white/[0.06] hover:text-[#F7F7F8] lg:inline-flex"
          >
            <a href={`/s/${website.slug}`} target="_blank" rel="noreferrer">
              {dict.editor.live}
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setPublishError(null);
            setPublishOpen(true);
          }}
          disabled={publishing}
          className="bg-[#FF6B57] px-3 text-white hover:bg-[#ff7d6c]"
        >
          {isPublished ? dict.editor.unpublish : dict.editor.publish}
        </Button>
        {flash ? (
          <div className="pointer-events-none absolute start-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 rounded-full bg-[#161618] px-3 py-1.5 text-[11px] text-[#F7F7F8] shadow-lg ring-1 ring-white/10">
            {flash}
          </div>
        ) : null}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Tablet/desktop left sidebar */}
        <aside className="hidden w-[240px] shrink-0 flex-col border-e border-white/[0.06] bg-[#0D0D0F] md:flex lg:w-[280px]">
          {sidebar}
        </aside>

        {/* Phone: sections pane (full screen, exclusive) */}
        <div
          className={cn(
            "min-h-0 flex-1 flex-col bg-[#0D0D0F] md:hidden",
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
            "min-h-0 flex-1 flex-col bg-[#0D0D0F] md:hidden",
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
            "relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0A0A0B]",
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
              onChange={setDevice}
            />
          </div>

          <div className="relative min-h-0 flex-1 overflow-auto">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="relative min-h-full">
              <EditorCanvasFrame device={device} brandName={config.brand.name}>
                {canvas}
              </EditorCanvasFrame>
            </div>
          </div>
        </main>

        {/* Desktop inspector */}
        <aside className="hidden w-[320px] shrink-0 flex-col border-s border-white/[0.06] bg-[#0D0D0F] lg:flex xl:w-[340px]">
          {inspectorDesktop}
        </aside>

        {/* Tablet inspector overlay — clean end panel */}
        {tabletInspectorOpen ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-40 bg-black/40 max-md:hidden lg:hidden"
              aria-label="Close"
              onClick={() => setTabletInspectorOpen(false)}
            />
            <div className="absolute inset-y-0 end-0 z-50 hidden w-[min(100%,360px)] flex-col border-s border-white/[0.08] bg-[#0D0D0F] shadow-2xl md:flex lg:hidden">
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
        existingTypes={new Set(config.sections.map((s) => s.type))}
        onClose={() => setLibraryOpen(false)}
        onAdd={(type) => {
          const next = addOrShowSection(config, type);
          applyConfig(next);
          const added = next.sections.find((s) => s.type === type && s.visible);
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
        isPublished={isPublished}
        changes={publishChanges}
        publishing={publishing}
        error={publishError}
        onClose={() => setPublishOpen(false)}
        onConfirm={() => void confirmPublish()}
      />
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-8 items-center justify-center rounded-md text-[#77777F] transition hover:bg-white/[0.06] hover:text-[#F7F7F8] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
