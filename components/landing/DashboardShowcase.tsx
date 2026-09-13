"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { BrandMark } from "@/components/landing/Brand";
import {
  ICON_SIZE,
  IconAnalytics,
  IconContent,
  IconDomain,
  IconInstagram,
  IconLayout,
  IconWebsite,
  type AppIcon,
} from "@/components/icons";
import { INSTAGRAM_DEMO_BRAND } from "@/lib/demo/instagram-demo";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { usePageVisible } from "@/lib/hooks/use-page-visible";
import { cn } from "@/lib/utils";
import {
  Bell,
  Check,
  ChevronRight,
  Eye,
  Globe2,
  GripVertical,
  LayoutDashboard,
  Link2,
  MousePointerClick,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

type DashPanel = "overview" | "content" | "analytics" | "domains" | "editor";
type DashTheme = "dark" | "light";
type StoryBeat = "idle" | "sync" | "shop" | "stats" | "publish" | "editor";

const PANELS: DashPanel[] = [
  "overview",
  "content",
  "analytics",
  "domains",
  "editor",
];

const CHART_BASE = [42, 58, 51, 72, 68, 84, 79, 96, 88, 110, 104, 128];
const CHART_UP = [42, 58, 51, 72, 68, 84, 79, 96, 108, 124, 138, 162];

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function panelLabel(panel: DashPanel, fa: boolean) {
  const map = {
    overview: fa ? "نمای کلی" : "Overview",
    content: fa ? "محتوا" : "Content",
    analytics: fa ? "آمار" : "Analytics",
    domains: fa ? "دامنه" : "Domains",
    editor: fa ? "ویرایشگر" : "Editor",
  } as const;
  return map[panel];
}

/**
 * Marketing dashboard demo — story, cursor, theme, deep editor, CTA.
 */
export function DashboardShowcase({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<HTMLButtonElement | null>(null);
  const publishRef = useRef<HTMLButtonElement | null>(null);
  const inView = useInView(sectionRef, { amount: 0.22 });
  const pageVisible = usePageVisible();
  const demoActive = inView && pageVisible;
  const reduce = useReducedMotion();
  const show = reduce || inView;
  const fa = locale === "fa";
  const brand = INSTAGRAM_DEMO_BRAND;

  const [panel, setPanel] = useState<DashPanel>("overview");
  const [theme, setTheme] = useState<DashTheme>("dark");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(true);
  const [visitors, setVisitors] = useState(1284);
  const [paused, setPaused] = useState(false);
  const [, setStoryBeat] = useState<StoryBeat>("idle");
  const [, setStoryIndex] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncedExtra, setSyncedExtra] = useState(false);
  const [chartBoost, setChartBoost] = useState(false);
  const publishingRef = useRef(false);
  const syncingRef = useRef(false);
  const [cursor, setCursor] = useState({
    x: 40,
    y: 80,
    visible: false,
    pressing: false,
  });
  const [accent, setAccent] = useState(brand.colors.mutedAccent);
  const [sections, setSections] = useState(() =>
    fa
      ? ["هیرو", "محصولات", "درباره", "گالری", "تماس"]
      : ["Hero", "Products", "About", "Gallery", "Contact"],
  );
  const [compact, setCompact] = useState<boolean | null>(null);

  const light = theme === "light";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const pointOf = useCallback((el: HTMLElement | null) => {
    const stage = stageRef.current;
    if (!stage || !el) return null;
    const stageBox = stage.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return {
      x: box.left - stageBox.left + box.width * 0.55,
      y: box.top - stageBox.top + box.height * 0.55,
    };
  }, []);

  const runPublish = useCallback(() => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setPublished(false);
    window.setTimeout(() => {
      publishingRef.current = false;
      setPublished(true);
      setPublishing(false);
    }, 1200);
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    await wait(900);
    setSyncedExtra(true);
    syncingRef.current = false;
    setSyncing(false);
  }, []);

  // Live visitor tick
  useEffect(() => {
    if (!demoActive || reduce) return;
    const id = window.setInterval(() => {
      setVisitors((value) => value + (chartBoost ? 4 : 1) + Math.floor(Math.random() * 2));
    }, 2000);
    return () => window.clearInterval(id);
  }, [chartBoost, demoActive, reduce]);

  // Guided story + cursor loop (desktop only — mobile uses a cleaner phone UI)
  useEffect(() => {
    if (!demoActive || reduce || paused || compact) {
      setCursor((c) => ({ ...c, visible: false }));
      return;
    }

    let cancelled = false;

    const moveTo = async (el: HTMLElement | null) => {
      const point = pointOf(el);
      if (!point || cancelled) return;
      setCursor((c) => ({ ...c, visible: true, pressing: false, ...point }));
      await wait(650);
    };

    const click = async () => {
      if (cancelled) return;
      setCursor((c) => ({ ...c, pressing: true }));
      await wait(160);
      if (cancelled) return;
      setCursor((c) => ({ ...c, pressing: false }));
      await wait(100);
    };

    const loop = async () => {
      await wait(900);
      while (!cancelled) {
        setStoryBeat("sync");
        setStoryIndex(0);
        setPanel("content");
        await wait(700);
        if (cancelled) return;

        // Wait a frame so sync button is mounted
        await wait(80);
        await moveTo(syncRef.current);
        if (cancelled) return;
        await click();
        if (cancelled) return;
        await runSync();
        if (cancelled) return;

        setStoryBeat("shop");
        setStoryIndex(1);
        await wait(1600);
        if (cancelled) return;

        setStoryBeat("stats");
        setStoryIndex(2);
        setPanel("analytics");
        setChartBoost(true);
        setVisitors((v) => v + 48);
        await wait(2200);
        if (cancelled) return;

        setStoryBeat("publish");
        setStoryIndex(3);
        await wait(80);
        await moveTo(publishRef.current);
        if (cancelled) return;
        await click();
        if (cancelled) return;
        runPublish();
        await wait(1800);
        if (cancelled) return;

        setStoryBeat("editor");
        setPanel("editor");
        setSections((prev) => {
          if (prev.length < 2) return prev;
          const next = [...prev];
          const [a] = next.splice(1, 1);
          next.splice(2, 0, a);
          return next;
        });
        setAccent((current) =>
          current === brand.colors.mutedAccent
            ? brand.colors.charcoal
            : brand.colors.mutedAccent,
        );
        await wait(2600);
        if (cancelled) return;

        setChartBoost(false);
        setSyncedExtra(false);
        setStoryBeat("idle");
        setPanel("overview");
        setCursor((c) => ({ ...c, visible: false }));
        await wait(1600);
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [
    brand.colors.charcoal,
    brand.colors.mutedAccent,
    compact,
    demoActive,
    paused,
    pointOf,
    reduce,
    runPublish,
    runSync,
  ]);

  // Soft panel tour on mobile (and reduced-motion desktop)
  useEffect(() => {
    if (!demoActive || paused) return;
    if (!compact && !reduce) return;
    const id = window.setInterval(() => {
      setPanel((current) => PANELS[(PANELS.indexOf(current) + 1) % PANELS.length]);
    }, 4500);
    return () => window.clearInterval(id);
  }, [compact, demoActive, paused, reduce]);

  const navItems = useMemo(
    () =>
      [
        { id: "overview" as const, icon: LayoutDashboard as AppIcon },
        { id: "content" as const, icon: IconContent },
        { id: "analytics" as const, icon: IconAnalytics },
        { id: "domains" as const, icon: IconDomain },
        { id: "editor" as const, icon: IconLayout },
      ] as const,
    [],
  );

  const shell = {
    page: light ? "bg-[#F4F2EE] text-[#1A1714]" : "bg-[#0a0a0b] text-white",
    side: light ? "bg-[#EFEBE4] border-[#1A1714]/10" : "bg-[#0d0d0f] border-white/[0.06]",
    header: light ? "border-[#1A1714]/10 bg-[#F7F4EF]" : "border-white/[0.06] bg-[#0a0a0b]",
    muted: light ? "text-[#6F675F]" : "text-foreground-muted",
    faint: light ? "text-[#9A9188]" : "text-foreground-faint",
    card: light
      ? "border-[#1A1714]/10 bg-white shadow-[0_8px_24px_rgba(26,23,20,0.04)]"
      : "border-white/[0.07] bg-white/[0.02]",
    soft: light ? "bg-black/[0.04]" : "bg-white/[0.04]",
    ring: light ? "ring-black/10" : "ring-white/[0.06]",
    navIdle: light
      ? "text-[#6F675F] hover:bg-black/[0.05] hover:text-[#1A1714]"
      : "text-foreground-muted hover:bg-white/[0.04] hover:text-foreground",
  };

  return (
    <section
      id="dashboard"
      ref={sectionRef}
      className="relative scroll-mt-24 overflow-hidden bg-background"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -start-24 top-24 size-[420px] rounded-full bg-[var(--mkt-glow)] blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-16 bottom-10 size-[380px] rounded-full bg-[#dd2a7b]/8 blur-[110px]"
        aria-hidden
      />

      <div className="container-marketing relative py-14 md:py-20 lg:py-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="type-label text-foreground-muted">
            {dict.dashboardDemo.eyebrow}
          </p>
          <h2 className="type-display-m mt-3 text-balance text-foreground md:mt-4">
            {dict.dashboardDemo.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[14px] leading-6 text-foreground-secondary md:mt-4 md:text-[15px] md:leading-7 lg:text-base lg:leading-8">
            <span className="lg:hidden">
              {fa
                ? "مدیریت سایت، محتوا و انتشار — همه در یک داشبورد موبایل‌پسند."
                : "Manage site, content, and publish — all in one phone-friendly dashboard."}
            </span>
            <span className="hidden lg:inline">{dict.dashboardDemo.body}</span>
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ delay: reduce ? 0 : 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 md:mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="order-2 text-center text-[11px] text-foreground-faint sm:order-1 sm:text-start md:text-[12px]">
              {compact
                ? fa
                  ? "تب‌ها را لمس کن یا صبر کن تا تور خودکار بچرخد"
                  : "Tap tabs — or wait for the auto tour"
                : dict.dashboardDemo.storyHint}
            </p>
            <div
              className="order-1 inline-flex items-center gap-1 rounded-full border border-border bg-[var(--mkt-panel)] p-1 sm:order-2"
              role="group"
              aria-label={fa ? "تم داشبورد" : "Dashboard theme"}
            >
              {(
                [
                  { id: "dark" as const, label: dict.dashboardDemo.themeDark },
                  { id: "light" as const, label: dict.dashboardDemo.themeLight },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={cn(
                    "relative rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-colors md:text-xs",
                    theme === option.id
                      ? "text-accent-foreground"
                      : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {theme === option.id ? (
                    <motion.span
                      layoutId="dash-theme-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative z-[1]">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {compact === null ? (
            <>
              <div className="phone-frame animate-pulse rounded-[3rem] bg-muted/40 lg:hidden" />
              <div className="mx-auto hidden h-[36rem] w-full max-w-none animate-pulse rounded-[1.25rem] bg-muted/40 lg:block" />
            </>
          ) : compact ? (
            <MobileDashPhone
              brand={brand}
              brandName={dict.brand}
              dict={dict}
              fa={fa}
              light={light}
              shell={shell}
              panel={panel}
              setPanel={setPanel}
              navItems={navItems}
              visitors={visitors}
              reduce={!!reduce}
              chart={chartBoost ? CHART_UP : CHART_BASE}
              chartBoost={chartBoost}
              syncRef={syncRef}
              syncing={syncing}
              syncedExtra={syncedExtra}
              onSync={() => void runSync()}
              publishing={publishing}
              published={published}
              onPublish={runPublish}
              publishRef={publishRef}
              accent={accent}
              onAccent={setAccent}
              sections={sections}
              onSections={setSections}
            />
          ) : (
            <DesktopDashStage
              brand={brand}
              dict={dict}
              fa={fa}
              light={light}
              shell={shell}
              panel={panel}
              setPanel={setPanel}
              navItems={navItems}
              visitors={visitors}
              reduce={!!reduce}
              chart={chartBoost ? CHART_UP : CHART_BASE}
              chartBoost={chartBoost}
              syncRef={syncRef}
              syncing={syncing}
              syncedExtra={syncedExtra}
              onSync={() => void runSync()}
              publishing={publishing}
              published={published}
              onPublish={runPublish}
              publishRef={publishRef}
              stageRef={stageRef}
              cursor={cursor}
              accent={accent}
              onAccent={setAccent}
              sections={sections}
              onSections={setSections}
            />
          )}

          <p className="mt-5 text-center text-[11px] text-foreground-faint md:text-[12px]">
            {compact
              ? fa
                ? "داشبورد واقعی ویترین — بهینه برای موبایل"
                : "The real Vitrin dashboard — tuned for mobile"
              : paused
                ? fa
                  ? "دمو متوقف — ماوس را بردار تا داستان ادامه یابد"
                  : "Demo paused — move away to resume the story"
                : fa
                  ? "موس خودکار روی Sync و Publish کلیک می‌کند"
                  : "Auto cursor clicks Sync and Publish for you"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

type NavItem = {
  id: DashPanel;
  icon: AppIcon;
};

function MobileDashPhone({
  brand,
  brandName,
  dict,
  fa,
  light,
  shell,
  panel,
  setPanel,
  navItems,
  visitors,
  reduce,
  chart,
  chartBoost,
  syncRef,
  syncing,
  syncedExtra,
  onSync,
  publishing,
  published,
  onPublish,
  publishRef,
  accent,
  onAccent,
  sections,
  onSections,
}: {
  brand: typeof INSTAGRAM_DEMO_BRAND;
  brandName: string;
  dict: Dictionary;
  fa: boolean;
  light: boolean;
  shell: {
    page: string;
    muted: string;
    faint: string;
    card: string;
    soft: string;
    ring: string;
    header: string;
  };
  panel: DashPanel;
  setPanel: (p: DashPanel) => void;
  navItems: readonly NavItem[];
  visitors: number;
  reduce: boolean;
  chart: number[];
  chartBoost: boolean;
  syncRef: RefObject<HTMLButtonElement | null>;
  syncing: boolean;
  syncedExtra: boolean;
  onSync: () => void;
  publishing: boolean;
  published: boolean;
  onPublish: () => void;
  publishRef: RefObject<HTMLButtonElement | null>;
  accent: string;
  onAccent: (v: string) => void;
  sections: string[];
  onSections: (value: string[] | ((prev: string[]) => string[])) => void;
}) {
  return (
    <div className="phone-frame max-md:[filter:drop-shadow(0_18px_40px_rgba(0,0,0,0.28))]">
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-[3rem] p-[7px]",
          light
            ? "bg-[linear-gradient(160deg,#ececee_0%,#d0d0d4_42%,#b8b8bc_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65),inset_0_0_0_1.5px_rgba(0,0,0,0.08)]"
            : "bg-[linear-gradient(160deg,#3a3a3c_0%,#1c1c1e_45%,#0c0c0d_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_0_0_1.5px_rgba(0,0,0,0.55)]",
        )}
      >
        <span
          className={cn(
            "absolute -start-[2px] top-[14%] h-[18px] w-[2px] rounded-s-sm",
            light ? "bg-[#c5c5c7]" : "bg-[#2c2c2e]",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "absolute -start-[2px] top-[22%] h-[36px] w-[2px] rounded-s-sm",
            light ? "bg-[#c5c5c7]" : "bg-[#2c2c2e]",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "absolute -start-[2px] top-[30%] h-[36px] w-[2px] rounded-s-sm",
            light ? "bg-[#c5c5c7]" : "bg-[#2c2c2e]",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "absolute -end-[2px] top-[24%] h-[52px] w-[2px] rounded-e-sm",
            light ? "bg-[#c5c5c7]" : "bg-[#2c2c2e]",
          )}
          aria-hidden
        />

        <div
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-[2.55rem]",
            shell.page,
          )}
        >
          {/* Status */}
          <div
            className={cn(
              "relative z-20 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 pt-3 pb-1 text-[12px] font-semibold",
              light ? "text-black" : "text-white",
            )}
            aria-hidden
          >
            <span className="justify-self-start ps-1 tabular-nums">9:41</span>
            <div className="h-[22px] w-[78px] rounded-full bg-black" />
            <span className="justify-self-end pe-0.5 text-[10px] opacity-80">
              {dict.dashboardDemo.live}
            </span>
          </div>

          {/* App top bar */}
          <div
            className={cn(
              "flex shrink-0 items-center gap-2.5 border-b px-3.5 py-2.5",
              light ? "border-black/10" : "border-white/[0.06]",
            )}
          >
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
              <BrandMark className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight">{brandName}</p>
              <p className={cn("truncate text-[10px]", shell.faint)}>{brand.handle}</p>
            </div>
            <button
              ref={publishRef}
              type="button"
              onClick={onPublish}
              disabled={publishing}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-[11px] font-semibold text-accent-foreground disabled:opacity-70"
            >
              {publishing ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : published ? (
                <Check size={12} />
              ) : (
                <Zap size={12} />
              )}
              {published
                ? dict.dashboardDemo.published
                : dict.dashboardDemo.publish}
            </button>
          </div>

          {/* Scrollable panel */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${panel}-${light ? "l" : "d"}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
              >
                {panel === "overview" ? (
                  <OverviewPanel
                    brand={brand}
                    fa={fa}
                    visitors={visitors}
                    reduce={reduce}
                    light={light}
                    shell={shell}
                    chart={chart}
                    compact
                  />
                ) : null}
                {panel === "content" ? (
                  <ContentPanel
                    brand={brand}
                    fa={fa}
                    dict={dict}
                    light={light}
                    shell={shell}
                    syncRef={syncRef}
                    syncing={syncing}
                    syncedExtra={syncedExtra}
                    onSync={onSync}
                    compact
                  />
                ) : null}
                {panel === "analytics" ? (
                  <AnalyticsPanel
                    fa={fa}
                    visitors={visitors}
                    reduce={reduce}
                    light={light}
                    shell={shell}
                    chart={chart}
                    boosted={chartBoost}
                    compact
                  />
                ) : null}
                {panel === "domains" ? (
                  <DomainsPanel brand={brand} fa={fa} light={light} shell={shell} compact />
                ) : null}
                {panel === "editor" ? (
                  <EditorPanel
                    brand={brand}
                    fa={fa}
                    light={light}
                    shell={shell}
                    accent={accent}
                    onAccent={onAccent}
                    sections={sections}
                    onSections={onSections}
                    compact
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom tabs */}
          <nav
            className={cn(
              "grid shrink-0 grid-cols-5 border-t px-1 pb-4 pt-1.5",
              light ? "border-black/10 bg-[#F7F4EF]/95" : "border-white/[0.06] bg-[#0a0a0b]/95",
            )}
            aria-label={fa ? "ناوبری داشبورد" : "Dashboard navigation"}
          >
            {navItems.map((item) => {
              const active = panel === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPanel(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[9px] font-medium transition-colors",
                    active ? "text-accent" : shell.faint,
                  )}
                >
                  <Icon size={16} aria-hidden />
                  <span className="truncate px-0.5">{panelLabel(item.id, fa)}</span>
                </button>
              );
            })}
          </nav>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-1.5 z-30 flex justify-center"
            aria-hidden
          >
            <span
              className={cn(
                "h-[3.5px] w-[108px] rounded-full",
                light ? "bg-black/25" : "bg-white/40",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopDashStage({
  brand,
  dict,
  fa,
  light,
  shell,
  panel,
  setPanel,
  navItems,
  visitors,
  reduce,
  chart,
  chartBoost,
  syncRef,
  syncing,
  syncedExtra,
  onSync,
  publishing,
  published,
  onPublish,
  publishRef,
  stageRef,
  cursor,
  accent,
  onAccent,
  sections,
  onSections,
}: {
  brand: typeof INSTAGRAM_DEMO_BRAND;
  dict: Dictionary;
  fa: boolean;
  light: boolean;
  shell: {
    page: string;
    side: string;
    header: string;
    muted: string;
    faint: string;
    card: string;
    soft: string;
    ring: string;
    navIdle: string;
  };
  panel: DashPanel;
  setPanel: (p: DashPanel) => void;
  navItems: readonly NavItem[];
  visitors: number;
  reduce: boolean;
  chart: number[];
  chartBoost: boolean;
  syncRef: RefObject<HTMLButtonElement | null>;
  syncing: boolean;
  syncedExtra: boolean;
  onSync: () => void;
  publishing: boolean;
  published: boolean;
  onPublish: () => void;
  publishRef: RefObject<HTMLButtonElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  cursor: { x: number; y: number; visible: boolean; pressing: boolean };
  accent: string;
  onAccent: (v: string) => void;
  sections: string[];
  onSections: (value: string[] | ((prev: string[]) => string[])) => void;
}) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-[8%] -bottom-6 h-24 rounded-full bg-accent/20 blur-3xl"
        aria-hidden
      />

      <div
        ref={stageRef}
        className="relative overflow-hidden rounded-[1.25rem] bg-[var(--mkt-chrome)] shadow-[var(--elevated-lg)] ring-1 ring-border"
      >
        {!reduce && cursor.visible ? (
          <motion.div
            className="pointer-events-none absolute z-40"
            animate={{
              left: cursor.x,
              top: cursor.y,
              scale: cursor.pressing ? 0.82 : 1,
            }}
            transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.55 }}
            style={{ x: "-30%", y: "-20%" }}
            aria-hidden
          >
            <div className="relative">
              <span className="absolute -inset-3 rounded-full bg-accent/30 blur-md" />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 3.5l14.5 8.2-6.4 1.5-3.2 6.6L5 3.5z"
                  fill="white"
                  stroke="rgba(255,107,87,0.55)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </motion.div>
        ) : null}

        <div className="flex items-center gap-3 border-b border-border bg-[var(--mkt-chrome-bar)] px-3 py-2.5 md:px-4">
          <div className="flex gap-1.5 ps-1" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#FF5F57]" />
            <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="size-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="mx-auto flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg bg-background/55 px-3 py-1.5 ring-1 ring-border">
            <Globe2 size={12} className="shrink-0 text-foreground-faint" aria-hidden />
            <p className="min-w-0 truncate text-center font-mono text-[11px] text-foreground-muted md:text-[12px]">
              https://{dict.dashboardDemo.browserUrl}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-600">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {dict.dashboardDemo.live}
          </span>
        </div>

        <div
          className={cn(
            "grid min-h-[420px] transition-colors duration-300 sm:min-h-[480px] lg:min-h-[600px] lg:grid-cols-[220px_minmax(0,1fr)]",
            shell.page,
          )}
        >
          <aside
            className={cn(
              "hidden border-e transition-colors duration-300 lg:flex lg:flex-col",
              shell.side,
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2.5 border-b px-4 py-4",
                light ? "border-black/10" : "border-white/[0.06]",
              )}
            >
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/30">
                <BrandMark className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{dict.brand}</p>
                <p className={cn("truncate text-[10px]", shell.faint)}>{brand.name}</p>
              </div>
            </div>

            <nav className="flex-1 space-y-0.5 p-3" aria-label="Dashboard demo">
              {navItems.map((item) => {
                const active = panel === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPanel(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] transition-colors",
                      active
                        ? "bg-accent/15 text-inherit ring-1 ring-accent/30"
                        : shell.navIdle,
                    )}
                  >
                    <Icon size={ICON_SIZE.sm} aria-hidden />
                    {panelLabel(item.id, fa)}
                  </button>
                );
              })}
            </nav>

            <div
              className={cn(
                "border-t p-3",
                light ? "border-black/10" : "border-white/[0.06]",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1",
                  shell.soft,
                  shell.ring,
                )}
              >
                <Image
                  src={brand.avatar}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium">{brand.handle}</p>
                  <p className={cn("truncate text-[10px]", shell.faint)}>
                    Pro · {brand.siteUrl}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            <header
              className={cn(
                "flex flex-wrap items-center gap-3 border-b px-4 py-3 transition-colors md:px-5",
                shell.header,
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
                {navItems.map((item) => {
                  const active = panel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPanel(item.id)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium",
                        active
                          ? "bg-accent text-accent-foreground"
                          : light
                            ? "bg-black/5 text-[#6F675F]"
                            : "bg-white/[0.05] text-foreground-muted",
                      )}
                    >
                      {panelLabel(item.id, fa)}
                    </button>
                  );
                })}
              </div>

              <div
                className={cn(
                  "hidden min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 ring-1 lg:flex",
                  shell.soft,
                  shell.ring,
                )}
              >
                <Search size={14} className={shell.faint} aria-hidden />
                <span className={cn("text-[12px]", shell.faint)}>
                  {fa
                    ? "جستجو در صفحات، محصولات، پست‌ها…"
                    : "Search pages, products, posts…"}
                </span>
              </div>

              <div className="ms-auto flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-xl ring-1",
                    shell.soft,
                    shell.ring,
                    shell.muted,
                  )}
                  aria-label="Notifications"
                >
                  <Bell size={15} />
                </button>
                <button
                  ref={publishRef}
                  type="button"
                  onClick={onPublish}
                  disabled={publishing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-2.5 text-[12px] font-semibold text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-70 sm:px-3.5"
                >
                  {publishing ? (
                    <RefreshCw size={13} className="animate-spin" aria-hidden />
                  ) : published ? (
                    <Check size={13} aria-hidden />
                  ) : (
                    <Zap size={13} aria-hidden />
                  )}
                  <span className="hidden sm:inline">
                    {publishing
                      ? fa
                        ? "در حال انتشار…"
                        : "Publishing…"
                      : published
                        ? dict.dashboardDemo.published
                        : dict.dashboardDemo.publish}
                  </span>
                </button>
              </div>
            </header>

            <div className="relative flex-1 overflow-hidden p-4 md:p-5 lg:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${panel}-${light ? "l" : "d"}`}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full"
                >
                  {panel === "overview" ? (
                    <OverviewPanel
                      brand={brand}
                      fa={fa}
                      visitors={visitors}
                      reduce={reduce}
                      light={light}
                      shell={shell}
                      chart={chart}
                    />
                  ) : null}
                  {panel === "content" ? (
                    <ContentPanel
                      brand={brand}
                      fa={fa}
                      dict={dict}
                      light={light}
                      shell={shell}
                      syncRef={syncRef}
                      syncing={syncing}
                      syncedExtra={syncedExtra}
                      onSync={onSync}
                    />
                  ) : null}
                  {panel === "analytics" ? (
                    <AnalyticsPanel
                      fa={fa}
                      visitors={visitors}
                      reduce={reduce}
                      light={light}
                      shell={shell}
                      chart={chart}
                      boosted={chartBoost}
                    />
                  ) : null}
                  {panel === "domains" ? (
                    <DomainsPanel brand={brand} fa={fa} light={light} shell={shell} />
                  ) : null}
                  {panel === "editor" ? (
                    <EditorPanel
                      brand={brand}
                      fa={fa}
                      light={light}
                      shell={shell}
                      accent={accent}
                      onAccent={onAccent}
                      sections={sections}
                      onSections={onSections}
                    />
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Shell = {
  muted: string;
  faint: string;
  card: string;
  soft: string;
  ring: string;
};

function OverviewPanel({
  brand,
  fa,
  visitors,
  reduce,
  light,
  shell,
  chart,
  compact = false,
}: {
  brand: typeof INSTAGRAM_DEMO_BRAND;
  fa: boolean;
  visitors: number;
  reduce: boolean;
  light: boolean;
  shell: Shell;
  chart: number[];
  compact?: boolean;
}) {
  const stats = [
    {
      label: fa ? "بازدید این هفته" : "Visits this week",
      value: visitors.toLocaleString(fa ? "fa-IR" : "en-US"),
      delta: "+18%",
      icon: Eye,
    },
    {
      label: fa ? "نرخ تبدیل" : "Conversion",
      value: fa ? "۳٫۸٪" : "3.8%",
      delta: "+0.6%",
      icon: MousePointerClick,
    },
    {
      label: fa ? "سفارش / لید" : "Orders / leads",
      value: fa ? "۴۲" : "42",
      delta: "+12",
      icon: Package,
    },
    {
      label: fa ? "همگام اینستا" : "IG synced",
      value: brand.posts,
      delta: fa ? "تازه" : "Fresh",
      icon: IconInstagram,
    },
  ];

  const quickActions = [
    { icon: Sparkles, label: fa ? "بازنویسی هیرو با AI" : "Rewrite hero with AI" },
    {
      icon: RefreshCw,
      label: fa ? "همگام‌سازی پست‌های جدید" : "Sync new Instagram posts",
    },
    {
      icon: Link2,
      label: fa ? "اتصال دامنه اختصاصی" : "Connect custom domain",
    },
  ];

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={cn("text-[11px] tracking-[0.16em] uppercase", shell.faint)}>
            {fa ? "نمای کلی سایت" : "Site overview"}
          </p>
          <h3
            className={cn(
              "mt-1 font-display",
              compact ? "text-lg" : "text-xl md:text-2xl",
            )}
          >
            {brand.name}
          </h3>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] ring-1",
            shell.soft,
            shell.ring,
            shell.muted,
          )}
        >
          <IconWebsite size={13} className="text-accent" aria-hidden />
          {brand.siteUrl}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn("rounded-2xl border", compact ? "p-3" : "p-4", shell.card)}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg",
                    compact ? "size-7" : "size-8",
                    shell.soft,
                    shell.muted,
                  )}
                >
                  <Icon size={compact ? 13 : 15} aria-hidden />
                </span>
                <span className="text-[11px] font-medium text-emerald-500">{stat.delta}</span>
              </div>
              <p
                className={cn(
                  "font-semibold tracking-tight tabular-nums",
                  compact ? "mt-2 text-[18px]" : "mt-4 text-[22px]",
                )}
              >
                {stat.value}
              </p>
              <p className={cn("mt-1 text-[11px]", shell.muted)}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className={cn("grid gap-3", !compact && "lg:grid-cols-[1.4fr_1fr]")}>
        <div className={cn("rounded-2xl border", compact ? "p-3" : "p-4 md:p-5", shell.card)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold">
                {fa ? "ترافیک ۷ روز" : "7-day traffic"}
              </p>
              <p className={cn("mt-0.5 text-[11px]", shell.muted)}>
                {fa ? "رشد پایدار از اینستاگرام و جستجو" : "Steady growth from Instagram + search"}
              </p>
            </div>
            <TrendingUp size={16} className="text-accent" aria-hidden />
          </div>
          <Sparkline
            values={chart}
            reduce={reduce}
            className={cn("mt-5 w-full", compact ? "h-20" : "h-28")}
          />
        </div>

        <div className="space-y-3">
          <div className={cn("rounded-2xl border", compact ? "p-3" : "p-4", shell.card)}>
            <p className="text-[12px] font-semibold">
              {fa ? "اقدام‌های سریع" : "Quick actions"}
            </p>
            <ul className={cn("mt-3", compact ? "space-y-1.5" : "space-y-2")}>
              {(compact ? quickActions.slice(0, 2) : quickActions).map((action) => (
                <li
                  key={action.label}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ring-1",
                    shell.soft,
                    shell.ring,
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 text-[12px]",
                      light ? "text-[#3A342E]" : "text-foreground-secondary",
                    )}
                  >
                    <action.icon size={14} className="text-accent" aria-hidden />
                    {action.label}
                  </span>
                  <ChevronRight size={14} className={cn(shell.faint, "rtl:rotate-180")} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPanel({
  brand,
  fa,
  dict,
  light,
  shell,
  syncRef,
  syncing,
  syncedExtra,
  onSync,
  compact = false,
}: {
  brand: typeof INSTAGRAM_DEMO_BRAND;
  fa: boolean;
  dict: Dictionary;
  light: boolean;
  shell: Shell;
  syncRef: RefObject<HTMLButtonElement | null>;
  syncing: boolean;
  syncedExtra: boolean;
  onSync: () => void;
  compact?: boolean;
}) {
  const imageLimit = compact ? 6 : 12;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl">
            {fa ? "کتابخانه محتوا" : "Content library"}
          </h3>
          <p className={cn("mt-1 text-[12px]", shell.muted)}>
            {fa
              ? "همان تصاویر اینستاگرام — آماده برای هیرو، گالری و محصولات"
              : "Same Instagram images — ready for hero, gallery, and products"}
          </p>
        </div>
        <button
          ref={syncRef}
          type="button"
          onClick={onSync}
          disabled={syncing}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium ring-1 transition-[filter,transform] active:scale-[0.98] disabled:opacity-70",
            syncing || syncedExtra
              ? "bg-accent text-accent-foreground ring-accent/40"
              : cn(shell.soft, shell.ring),
          )}
        >
          {syncing ? (
            <RefreshCw size={14} className="animate-spin" aria-hidden />
          ) : (
            <IconInstagram size={14} aria-hidden />
          )}
          {syncing
            ? dict.dashboardDemo.syncing
            : syncedExtra
              ? dict.dashboardDemo.synced
              : dict.dashboardDemo.sync}
        </button>
      </div>

      <AnimatePresence>
        {syncedExtra ? (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8 }}
            className="overflow-hidden rounded-2xl border border-accent/35 bg-accent/10 px-4 py-3 text-[12px] text-inherit"
          >
            {fa
              ? "پست جدید از اینستاگرام به گالری و فروشگاه اضافه شد."
              : "A new Instagram post was added to gallery and shop."}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          "grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6",
          compact ? "gap-1.5" : "md:gap-3",
        )}
      >
        {(syncedExtra
          ? [brand.images[3], ...brand.images]
          : brand.images
        )
          .slice(0, imageLimit)
          .map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl ring-1",
                light ? "ring-[#1A1714]/10" : "ring-white/10",
                index === 0 && syncedExtra && "ring-2 ring-accent",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="120px"
              />
              {index === 0 && syncedExtra ? (
                <span className="absolute start-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[8px] font-semibold text-accent-foreground">
                  New
                </span>
              ) : null}
            </div>
          ))}
      </div>

      <div className={cn("grid gap-3", !compact && "md:grid-cols-3")}>
        {[
          ...brand.products,
          ...(syncedExtra
            ? [
                {
                  id: "new-ritual",
                  name: fa ? "روغن شب جدید" : "New Night Oil",
                  price: "$54",
                  image: brand.images[3],
                },
              ]
            : []),
        ].map((product) => (
          <div
            key={product.id}
            className={cn(
              "flex rounded-2xl border",
              compact ? "gap-2 p-2.5" : "gap-3 p-3",
              shell.card,
            )}
          >
            <div
              className={cn(
                "relative shrink-0 overflow-hidden rounded-xl",
                compact ? "size-14" : "size-16",
              )}
            >
              <Image src={product.image} alt="" fill className="object-cover" sizes="64px" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{product.name}</p>
              <p className={cn("mt-0.5 text-[12px]", shell.muted)}>{product.price}</p>
              <p className="mt-2 text-[10px] text-emerald-500">
                {fa ? "فعال در فروشگاه" : "Live in shop"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPanel({
  fa,
  visitors,
  reduce,
  light,
  shell,
  chart,
  boosted,
  compact = false,
}: {
  fa: boolean;
  visitors: number;
  reduce: boolean;
  light: boolean;
  shell: Shell;
  chart: number[];
  boosted: boolean;
  compact?: boolean;
}) {
  const sources = [
    { name: "Instagram", value: boosted ? 61 : 54, color: "#dd2a7b" },
    { name: fa ? "جستجو" : "Search", value: boosted ? 24 : 28, color: "#FF6B57" },
    { name: fa ? "مستقیم" : "Direct", value: 12, color: "#FEBC2E" },
    { name: fa ? "سایر" : "Other", value: boosted ? 3 : 6, color: "#515bd4" },
  ];

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className={cn("font-display", compact ? "text-lg" : "text-xl")}>
            {fa ? "آمار عملکرد" : "Performance"}
          </h3>
          <p className={cn("mt-1 text-[12px]", shell.muted)}>
            {fa
              ? "بفهم از کجا می‌آیند و چه چیزی می‌فروشد"
              : "See where they come from — and what converts"}
          </p>
        </div>
        <p className="rounded-full bg-accent/15 px-3 py-1 text-[11px] font-medium text-accent">
          {visitors.toLocaleString(fa ? "fa-IR" : "en-US")}{" "}
          {fa ? "بازدید زنده" : "live visits"}
          {boosted ? (fa ? " · جهش" : " · spike") : ""}
        </p>
      </div>

      <div className={cn("grid gap-3", !compact && "lg:grid-cols-[1.5fr_1fr]")}>
        <div className={cn("rounded-2xl border", compact ? "p-3" : "p-4 md:p-5", shell.card)}>
          <Sparkline
            values={chart}
            reduce={reduce}
            className={cn("w-full", compact ? "h-24" : "h-40")}
            thick
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [fa ? "میانگین جلسه" : "Avg. session", fa ? "۱:۴۲" : "1:42"],
              [fa ? "صفحات / بازدید" : "Pages / visit", "2.4"],
              [fa ? "بازگشتی" : "Returning", fa ? "۳۱٪" : "31%"],
            ].map(([label, value]) => (
              <div
                key={label}
                className={cn("rounded-xl px-3 py-2.5 ring-1", shell.soft, shell.ring)}
              >
                <p className="text-[16px] font-semibold tabular-nums">{value}</p>
                <p className={cn("mt-0.5 text-[10px]", shell.muted)}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cn("rounded-2xl border", compact ? "p-3" : "p-4 md:p-5", shell.card)}>
          <p className="text-[13px] font-semibold">
            {fa ? "منابع ترافیک" : "Traffic sources"}
          </p>
          <ul className={cn("mt-4", compact ? "space-y-2" : "space-y-3")}>
            {sources.map((source) => (
              <li key={source.name}>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className={shell.muted}>{source.name}</span>
                  <span className="tabular-nums">{source.value}%</span>
                </div>
                <div
                  className={cn(
                    "h-1.5 overflow-hidden rounded-full",
                    light ? "bg-black/10" : "bg-white/[0.06]",
                  )}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: source.color }}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${source.value}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DomainsPanel({
  brand,
  fa,
  light,
  shell,
  compact = false,
}: {
  brand: typeof INSTAGRAM_DEMO_BRAND;
  fa: boolean;
  light: boolean;
  shell: Shell;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <h3 className={cn("font-display", compact ? "text-lg" : "text-xl")}>
          {fa ? "دامنه و SEO" : "Domain & SEO"}
        </h3>
        <p className={cn("mt-1 text-[12px]", shell.muted)}>
          {fa
            ? "آدرس برندت را وصل کن — اعتماد مشتری از همین‌جا شروع می‌شود"
            : "Connect your brand URL — trust starts here"}
        </p>
      </div>

      <div className={cn("grid gap-3", !compact && "lg:grid-cols-2")}>
        <div className={cn("rounded-2xl border border-accent/30 bg-accent/10", compact ? "p-4" : "p-5")}>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <Globe2 size={16} aria-hidden />
            </span>
            <p className="text-[13px] font-semibold">
              {fa ? "دامنه فعال" : "Active domain"}
            </p>
          </div>
          <p className="mt-4 font-mono text-lg md:text-xl">{brand.siteUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-500">
              SSL
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-500">
              CDN
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium",
                light ? "bg-black/10 text-[#6F675F]" : "bg-white/10 text-foreground-muted",
              )}
            >
              DNS ✓
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border", compact ? "p-4" : "p-5", shell.card)}>
          <p className="text-[13px] font-semibold">{fa ? "امتیاز SEO" : "SEO score"}</p>
          <div className="mt-4 flex items-end gap-3">
            <p
              className={cn(
                "font-display tracking-tight",
                compact ? "text-4xl" : "text-5xl",
              )}
            >
              92
            </p>
            <p className="mb-2 text-[12px] text-emerald-500">{fa ? "عالی" : "Excellent"}</p>
          </div>
          <ul className={cn("mt-4 space-y-2 text-[12px]", shell.muted)}>
            <li className="flex items-center gap-2">
              <Check size={13} className="text-emerald-500" />
              {fa ? "عنوان و متا از برند ساخته شده" : "Title & meta generated from brand"}
            </li>
            <li className="flex items-center gap-2">
              <Check size={13} className="text-emerald-500" />
              {fa ? "تصاویر با alt هوشمند" : "Smart image alt text"}
            </li>
            <li className="flex items-center gap-2">
              <Check size={13} className="text-emerald-500" />
              {fa ? "موبایل‌اول و سریع" : "Mobile-first & fast"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function EditorPanel({
  brand,
  fa,
  light,
  shell,
  accent,
  onAccent,
  sections,
  onSections,
  compact = false,
}: {
  brand: typeof INSTAGRAM_DEMO_BRAND;
  fa: boolean;
  light: boolean;
  shell: Shell;
  accent: string;
  onAccent: (value: string) => void;
  sections: string[];
  onSections: (value: string[] | ((prev: string[]) => string[])) => void;
  compact?: boolean;
}) {
  const palette = [
    brand.colors.mutedAccent,
    brand.colors.charcoal,
    "#FF6B57",
    "#7A8F7A",
    "#5C4A3A",
  ];

  const moveSection = (index: number, dir: -1 | 1) => {
    onSections((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  return (
    <div className={cn("grid gap-4", !compact && "lg:grid-cols-[1fr_0.95fr]")}>
      <div className={cn("space-y-3", compact && "space-y-2")}>
        <div className="flex items-center justify-between gap-3">
          <h3 className={cn("font-display", compact ? "text-lg" : "text-xl")}>
            {fa ? "ویرایشگر بصری" : "Visual editor"}
          </h3>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-medium text-accent">
            {fa ? "ذخیره خودکار" : "Autosaved"}
          </span>
        </div>

        <div
          className={cn(
            "overflow-hidden rounded-2xl border",
            light ? "border-[#1A1714]/10 bg-white" : "border-white/[0.08] bg-[#111113]",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 border-b px-3 py-2",
              light ? "border-[#1A1714]/08" : "border-white/[0.06]",
            )}
          >
            <span className="size-1.5 rounded-full bg-[#FF5F57]" />
            <span className="size-1.5 rounded-full bg-[#FEBC2E]" />
            <span className="size-1.5 rounded-full bg-[#28C840]" />
            <span className={cn("ms-2 font-mono text-[10px]", shell.faint)}>
              {brand.siteUrl}
            </span>
          </div>
          <div
            className="relative aspect-[16/11] overflow-hidden"
            style={{ background: brand.colors.ivory }}
          >
            <Image
              src={brand.images[1]}
              alt=""
              fill
              className="object-cover opacity-90"
              sizes="480px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <motion.div
              className="absolute inset-x-6 bottom-6 rounded-xl border border-dashed bg-black/35 p-4 backdrop-blur-md"
              style={{ borderColor: `${accent}b3` }}
              animate={{
                boxShadow: [
                  `0 0 0 0 ${accent}00`,
                  `0 0 0 6px ${accent}2e`,
                  `0 0 0 0 ${accent}00`,
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <p className="text-[10px] tracking-[0.18em] text-white/60 uppercase">
                {fa ? "در حال ویرایش" : "Editing"} · {sections[0]}
              </p>
              <p className="mt-1 font-display text-lg text-white md:text-xl">
                {brand.headline}
              </p>
              <p className="mt-1 max-w-sm text-[11px] text-white/75">
                {brand.subheadline}
              </p>
              <span
                className="mt-3 inline-flex rounded-md px-3 py-1.5 text-[10px] font-semibold text-white"
                style={{ background: accent }}
              >
                {brand.cta}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className={cn("space-y-3", compact && "space-y-2")}>
        <div className={cn("rounded-2xl border", compact ? "p-3" : "p-4", shell.card)}>
          <p className="text-[12px] font-semibold">
            {fa ? "بخش‌ها — جابه‌جا کن" : "Sections — reorder"}
          </p>
          <ul className={cn("mt-3", compact ? "space-y-1" : "space-y-1.5")}>
            {sections.map((section, index) => (
              <li
                key={`${section}-${index}`}
                className={cn(
                  "flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] ring-1",
                  index === 0
                    ? "bg-accent/15 ring-accent/30"
                    : cn(shell.soft, shell.ring),
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <GripVertical size={14} className={shell.faint} aria-hidden />
                  <span className="font-mono text-[10px] opacity-60">0{index + 1}</span>
                  {section}
                </span>
                <span className="inline-flex gap-1">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] ring-1",
                      shell.ring,
                      shell.muted,
                    )}
                    onClick={() => moveSection(index, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] ring-1",
                      shell.ring,
                      shell.muted,
                    )}
                    onClick={() => moveSection(index, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn("rounded-2xl border", compact ? "p-3" : "p-4", shell.card)}>
          <p className="text-[12px] font-semibold">
            {fa ? "رنگ تاکید زنده" : "Live accent color"}
          </p>
          <div className={cn("mt-3 flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
            {palette.map((hex, index) => (
              <button
                key={`${hex}-${index}`}
                type="button"
                onClick={() => onAccent(hex)}
                className={cn(
                  "rounded-full ring-1 transition-transform",
                  compact ? "size-8" : "size-9",
                  accent === hex ? "scale-110 ring-2 ring-accent ring-offset-2" : "",
                  light ? "ring-offset-[#F4F2EE]" : "ring-offset-[#0a0a0b]",
                )}
                style={{ background: hex }}
                aria-label={hex}
              />
            ))}
          </div>
          <p className={cn("mt-3 text-[11px] leading-5", shell.muted)}>
            {fa
              ? "رنگ CTA و هایلایت هیرو همان لحظه عوض می‌شود — مثل ویرایشگر واقعی."
              : "CTA and hero highlight update instantly — like the real editor."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Sparkline({
  values,
  className,
  reduce,
  thick = false,
}: {
  values: number[];
  className?: string;
  reduce: boolean;
  thick?: boolean;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / (max - min || 1)) * 78 - 8;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,100 ${points} 100,100`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="dash-fill-v2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,107,87,0.35)" />
          <stop offset="100%" stopColor="rgba(255,107,87,0)" />
        </linearGradient>
      </defs>
      <motion.polygon
        points={area}
        fill="url(#dash-fill-v2)"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.polyline
        points={points}
        fill="none"
        stroke="#FF6B57"
        strokeWidth={thick ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
