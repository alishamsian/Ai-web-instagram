"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
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
import { HERO_DEMO } from "@/lib/demo/hero";
import { brandConfig } from "@/lib/config/brand";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { usePageVisible } from "@/lib/hooks/use-page-visible";
import { cn } from "@/lib/utils";
import { Battery, Check, Link2, Signal, Wifi } from "lucide-react";

type Beat =
  | "ig"
  | "copy"
  | "pack"
  | "vitrin"
  | "paste"
  | "build"
  | "scan"
  | "reveal"
  | "done";

type PackMode = "idle" | "form" | "dock" | "scan" | "gone";
type SiteMode = "dark" | "light";

type Cursor = {
  x: number;
  y: number;
  visible: boolean;
  pressing: boolean;
};

const FASHION_THEME = {
  dark: {
    bg: "#0E0D0C",
    fg: "#F6F1EA",
    muted: "#A59B90",
    surface: "#181614",
    card: "#1C1A17",
    border: "rgba(255,255,255,0.08)",
    accent: "#E8C9A8",
    accentFg: "#14110F",
    heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.78))",
  },
  light: {
    bg: "#F4EFE7",
    fg: "#1A1612",
    muted: "#7A7168",
    surface: "#EBE4DA",
    card: "#FFFFFF",
    border: "rgba(26,22,18,0.08)",
    accent: "#1A1612",
    accentFg: "#F6F1EA",
    heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.62))",
  },
} as const;

const IG_URL = `instagram.com/${HERO_DEMO.username}`;
const APP_URL = "app.vitrin.app/create";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatTimer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Hero product story — polished browser demo.
 * IG → copy → compress → paste on Vitrin → AI extract → site reveal.
 */
export function HeroTransformation({
  dict,
  locale,
  className,
}: {
  dict: Dictionary;
  locale: Locale;
  className?: string;
}) {
  const fa = locale === "fa";
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const buildRef = useRef<HTMLButtonElement>(null);
  const siteScrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.25 });
  const pageVisible = usePageVisible();
  const demoActive = inView && pageVisible;

  const [beat, setBeat] = useState<Beat>("ig");
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [building, setBuilding] = useState(false);
  const [scanStep, setScanStep] = useState(-1);
  const [revealStep, setRevealStep] = useState(-1);
  const [packMode, setPackMode] = useState<PackMode>("idle");
  const [siteMode, setSiteMode] = useState<SiteMode>("dark");
  const [cursor, setCursor] = useState<Cursor>({
    x: 80,
    y: 80,
    visible: false,
    pressing: false,
  });
  const theme = FASHION_THEME[siteMode];
  const igDark = siteMode === "dark";

  const scanItems = fa
    ? ["هویت", "سبک", "محصولات", "لحن", "ساختار"]
    : ["Identity", "Style", "Products", "Tone", "Structure"];

  const steps = fa
    ? ["کپی", "انتقال", "ساخت", "AI", "سایت"]
    : ["Copy", "Move", "Build", "AI", "Site"];

  const stepIndex = (() => {
    if (beat === "ig" || beat === "copy") return 0;
    if (beat === "pack") return 1;
    if (beat === "vitrin" || beat === "paste" || beat === "build") return 2;
    if (beat === "scan") return 3;
    return 4;
  })();

  const pointOf = useCallback((el: HTMLElement | null) => {
    const stage = stageRef.current;
    if (!stage || !el) return null;
    const stageBox = stage.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return {
      x: box.left - stageBox.left + box.width * 0.5,
      y: box.top - stageBox.top + box.height * 0.55,
    };
  }, []);

  const moveTo = useCallback(
    async (el: HTMLElement | null) => {
      const p = pointOf(el);
      if (!p) return;
      setCursor((c) => ({ ...c, visible: true, pressing: false, ...p }));
      await wait(620);
    },
    [pointOf],
  );

  const click = useCallback(async () => {
    setCursor((c) => ({ ...c, pressing: true }));
    await wait(150);
    setCursor((c) => ({ ...c, pressing: false }));
    await wait(90);
  }, []);

  useEffect(() => {
    if (reduce || !demoActive || paused) return;
    const id = window.setInterval(() => setElapsed((e) => e + 100), 100);
    return () => window.clearInterval(id);
  }, [demoActive, paused, reduce]);

  useEffect(() => {
    if (reduce || !demoActive) {
      setCursor((c) => ({ ...c, visible: false }));
      return;
    }

    let cancelled = false;

    const reset = () => {
      setBeat("ig");
      setElapsed(0);
      setCopied(false);
      setPasted(false);
      setBuilding(false);
      setScanStep(-1);
      setRevealStep(-1);
      setPackMode("idle");
      setCursor((c) => ({ ...c, visible: false, pressing: false }));
    };

    const loop = async () => {
      while (!cancelled) {
        while (paused && !cancelled) await wait(200);
        if (cancelled) return;

        reset();
        await wait(800);
        if (cancelled) return;

        setBeat("copy");
        await moveTo(urlRef.current);
        if (cancelled) return;
        await click();
        setCopied(true);
        await wait(700);
        if (cancelled) return;

        setBeat("pack");
        setCursor((c) => ({ ...c, visible: false }));
        setPackMode("form");
        await wait(1000);
        if (cancelled) return;
        setPackMode("dock");
        await wait(700);
        if (cancelled) return;

        setBeat("vitrin");
        setCopied(false);
        await wait(550);
        if (cancelled) return;

        setBeat("paste");
        await moveTo(inputRef.current);
        if (cancelled) return;
        await click();
        setPasted(true);
        await wait(650);
        if (cancelled) return;

        setBeat("build");
        await moveTo(buildRef.current);
        if (cancelled) return;
        await click();
        setBuilding(true);
        setCursor((c) => ({ ...c, visible: false }));
        await wait(500);
        if (cancelled) return;

        setBeat("scan");
        setPackMode("scan");
        for (let i = 0; i < scanItems.length; i++) {
          if (cancelled) return;
          setScanStep(i);
          await wait(480);
        }
        await wait(350);
        if (cancelled) return;
        setPackMode("gone");

        setBeat("reveal");
        setBuilding(false);
        if (siteScrollRef.current) siteScrollRef.current.scrollTop = 0;
        for (let i = 0; i <= 4; i++) {
          if (cancelled) return;
          setRevealStep(i);
          await wait(400);
        }

        // Auto-scroll the finished site
        setBeat("done");
        const scroller = siteScrollRef.current;
        if (scroller) {
          const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
          const stepsN = 28;
          for (let i = 1; i <= stepsN; i++) {
            if (cancelled) return;
            while (paused && !cancelled) await wait(200);
            scroller.scrollTop = (max * i) / stepsN;
            await wait(70);
          }
          await wait(600);
          for (let i = stepsN; i >= 0; i--) {
            if (cancelled) return;
            while (paused && !cancelled) await wait(200);
            scroller.scrollTop = (max * i) / stepsN;
            await wait(45);
          }
        }
        await wait(1400);
        if (cancelled) return;
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [click, demoActive, moveTo, paused, reduce, scanItems.length]);

  const showIg = beat === "ig" || beat === "copy" || beat === "pack";
  const showVitrin =
    beat === "vitrin" ||
    beat === "paste" ||
    beat === "build" ||
    beat === "scan";
  const showSite = beat === "reveal" || beat === "done";
  const browserUrl = showIg ? IG_URL : showSite ? HERO_DEMO.siteUrl : APP_URL;
  const packing = packMode === "form";
  const tokenVisible = packMode !== "idle" && packMode !== "gone";

  if (reduce) {
    return (
      <div className={cn("relative", className)}>
        <StaticFallback locale={locale} dict={dict} />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slim timer + theme toggle */}
      <div className="mx-auto mb-4 max-w-[360px] md:mb-6 md:max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-mono text-[13px] tabular-nums tracking-tight text-foreground">
              {formatTimer(elapsed)}
            </span>
            <span className="truncate text-[11px] text-foreground-faint">
              {steps[stepIndex]}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--mkt-panel)] p-0.5"
              role="group"
              aria-label={fa ? "حالت نمایش" : "Display theme"}
            >
              {(
                [
                  { id: "dark" as const, label: fa ? "دارک" : "Dark" },
                  { id: "light" as const, label: fa ? "لایت" : "Light" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSiteMode(option.id)}
                  className={cn(
                    "relative rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                    siteMode === option.id
                      ? "text-accent-foreground"
                      : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {siteMode === option.id ? (
                    <motion.span
                      layoutId="hero-site-mode"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <span className="relative z-[1]">{option.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5" aria-hidden>
              {steps.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i === stepIndex
                      ? "w-5 bg-accent"
                      : i < stepIndex
                        ? "w-1.5 bg-foreground/35"
                        : "w-1.5 bg-foreground/12",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 h-px overflow-hidden bg-border-subtle">
          <motion.div
            className="h-full bg-accent/70"
            animate={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
      </div>

      <div
        ref={stageRef}
        className="phone-frame phone-frame--desktop-fluid relative mx-auto w-full max-md:[filter:drop-shadow(0_18px_40px_rgba(0,0,0,0.28))]"
      >
        <div
          className={cn(
            "relative h-full overflow-hidden",
            "rounded-[3rem] p-[7px]",
            "max-md:bg-[linear-gradient(160deg,#3a3a3c_0%,#1c1c1e_45%,#0c0c0d_100%)]",
            "max-md:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_0_0_1.5px_rgba(0,0,0,0.55)]",
            "md:rounded-[1.25rem] md:bg-[var(--mkt-chrome)] md:p-0 md:shadow-[var(--elevated-lg)] md:ring-1 md:ring-border",
          )}
        >
          <span
            className="absolute -start-[2px] top-[14%] h-[18px] w-[2px] rounded-s-sm bg-[#2c2c2e] md:hidden"
            aria-hidden
          />
          <span
            className="absolute -start-[2px] top-[22%] h-[36px] w-[2px] rounded-s-sm bg-[#2c2c2e] md:hidden"
            aria-hidden
          />
          <span
            className="absolute -start-[2px] top-[30%] h-[36px] w-[2px] rounded-s-sm bg-[#2c2c2e] md:hidden"
            aria-hidden
          />
          <span
            className="absolute -end-[2px] top-[24%] h-[52px] w-[2px] rounded-e-sm bg-[#2c2c2e] md:hidden"
            aria-hidden
          />

          <div className="relative flex h-full flex-col overflow-hidden rounded-[2.55rem] bg-black md:rounded-none md:bg-transparent">
            <div
              className="relative z-30 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 pt-3 pb-1 text-[12px] font-semibold tracking-tight text-white md:hidden"
              aria-hidden
            >
              <span className="justify-self-start ps-1 tabular-nums">9:41</span>
              <div className="relative h-[22px] w-[78px] rounded-full bg-black">
                <span
                  className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                  style={{
                    right: 11,
                    background:
                      "radial-gradient(circle at 30% 30%, #4a4a4c, #1a1a1c 70%)",
                  }}
                />
              </div>
              <span className="inline-flex items-center justify-self-end gap-[3px] pe-0.5 opacity-90">
                <Signal size={12} strokeWidth={2.4} />
                <Wifi size={12} strokeWidth={2.4} />
                <Battery size={16} strokeWidth={1.9} />
              </span>
            </div>

            <div className="relative z-20 hidden items-center gap-3 border-b border-border bg-[var(--mkt-chrome-bar)] px-3 py-2.5 md:flex md:px-4">
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div
                ref={urlRef}
                className={cn(
                  "relative flex min-w-0 flex-1 items-center gap-2 rounded-md bg-background/55 px-3 py-1.5 ring-1 transition-[box-shadow,ring-color] duration-300",
                  beat === "copy" ? "ring-accent/45" : "ring-border",
                )}
              >
                <Link2 size={12} className="shrink-0 text-foreground-faint" aria-hidden />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={browserUrl}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.22 }}
                    className="truncate font-mono text-[11px] text-foreground-muted md:text-[12px]"
                  >
                    https://{browserUrl}
                  </motion.span>
                </AnimatePresence>
                <AnimatePresence>
                  {copied ? (
                    <motion.span
                      initial={{ opacity: 0, x: 4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="ms-auto shrink-0 text-[10px] font-medium text-accent"
                    >
                      {fa ? "کپی شد" : "Copied"}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div
              className={cn(
                "relative z-20 mx-3 mb-1 flex shrink-0 items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[10px] md:hidden",
                beat === "copy" ? "ring-1 ring-accent/50" : "",
                "bg-white/8 text-white/60",
              )}
            >
              <Link2 size={10} className="shrink-0 opacity-70" aria-hidden />
              <span className="truncate font-mono">https://{browserUrl}</span>
              {copied ? (
                <span className="ms-auto shrink-0 text-accent">
                  {fa ? "کپی شد" : "Copied"}
                </span>
              ) : null}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden md:min-h-[420px] lg:min-h-[500px]">
          <AnimatePresence mode="wait">
            {showIg ? (
              <motion.div
                key="ig"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: packing || packMode === "dock" ? 0 : 1,
                  scale: packing ? 0.12 : 1,
                  filter: packing ? "blur(10px)" : "blur(0px)",
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "absolute inset-0 origin-center overflow-hidden",
                  igDark ? "bg-[#000000]" : "bg-[#fafafa]",
                )}
                style={{ transformOrigin: "50% 38%" }}
              >
                <InstagramPage locale={locale} dark={igDark} />
              </motion.div>
            ) : null}

            {showVitrin ? (
              <motion.div
                key="vitrin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 overflow-hidden bg-[#0a0a0b]"
              >
                <VitrinCreate
                  dict={dict}
                  locale={locale}
                  pasted={pasted}
                  building={building}
                  inputRef={inputRef}
                  buildRef={buildRef}
                  scanning={beat === "scan"}
                  scanItems={scanItems}
                  scanStep={scanStep}
                />
              </motion.div>
            ) : null}

            {showSite ? (
              <motion.div
                key="site"
                ref={siteScrollRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ background: theme.bg }}
              >
                <BuiltWebsite
                  locale={locale}
                  revealStep={revealStep}
                  theme={theme}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Compressed Instagram mini-card */}
          <AnimatePresence>
            {tokenVisible ? (
              <motion.div
                key="token"
                className="pointer-events-none absolute z-20"
                initial={{
                  left: "50%",
                  top: "40%",
                  x: "-50%",
                  y: "-50%",
                  scale: 0.55,
                  opacity: 0,
                }}
                animate={
                  packMode === "form"
                    ? {
                        left: "50%",
                        right: "auto",
                        top: "40%",
                        x: "-50%",
                        y: "-50%",
                        scale: 1,
                        opacity: 1,
                      }
                    : packMode === "dock"
                      ? {
                          left: "auto",
                          right: 14,
                          top: 12,
                          x: 0,
                          y: 0,
                          scale: 0.88,
                          opacity: 1,
                        }
                      : {
                          left: "50%",
                          right: "auto",
                          top: "20%",
                          x: "-50%",
                          y: "0%",
                          scale: 1,
                          opacity: 1,
                        }
                }
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  y: -20,
                  filter: "blur(4px)",
                }}
                transition={{ type: "spring", stiffness: 190, damping: 22 }}
              >
                <CompressedProfile
                  scanning={packMode === "scan"}
                  scanStep={scanStep}
                  scanTotal={scanItems.length}
                  locale={locale}
                  dark={igDark}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <DemoCursor cursor={cursor} />
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-1.5 z-30 flex justify-center md:hidden"
              aria-hidden
            >
              <span className="h-[3.5px] w-[108px] rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Compressed Instagram mini-card (page folded into itself) ─── */

function CompressedProfile({
  scanning,
  scanStep,
  scanTotal,
  locale,
  dark,
}: {
  scanning: boolean;
  scanStep: number;
  scanTotal: number;
  locale: Locale;
  dark: boolean;
}) {
  const progress = scanning
    ? Math.max(0, Math.min(1, (scanStep + 1) / scanTotal))
    : 0;

  return (
    <div
      dir="ltr"
      className={cn(
        "relative w-[168px] overflow-hidden rounded-[14px] md:w-[184px]",
        dark ? "bg-[#121212] text-white" : "bg-white text-[#0f0f0f]",
      )}
      style={{
        boxShadow: dark
          ? "0 0 0 1px rgba(255,255,255,0.1), 0 22px 50px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(0,0,0,0.08), 0 22px 50px rgba(0,0,0,0.4)",
      }}
    >
      {scanning ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-10 h-8 bg-gradient-to-b from-transparent via-accent/40 to-transparent"
          initial={{ top: "-25%" }}
          animate={{ top: "115%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      ) : null}

      <div className="relative px-2.5 pb-2 pt-2.5">
        <div className="flex items-center gap-2">
          <div
            className="rounded-full p-[1.5px]"
            style={{
              background:
                "conic-gradient(from 210deg, #f58529, #dd2a7b, #8134af, #515bd4, #f58529)",
            }}
          >
            <Image
              src={HERO_DEMO.avatar}
              alt=""
              width={28}
              height={28}
              className={cn(
                "size-7 rounded-full object-cover p-[1px]",
                dark ? "bg-[#121212]" : "bg-white",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold leading-none">
              {HERO_DEMO.username}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-[9px]",
                dark ? "text-white/45" : "text-[#8e8e8e]",
              )}
            >
              {HERO_DEMO.category[locale]}
            </p>
          </div>
          <span className="rounded bg-[#0095f6] px-1.5 py-0.5 text-[8px] font-semibold text-white">
            Follow
          </span>
        </div>

        <div
          className={cn(
            "mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-[6px]",
            dark ? "bg-white/10" : "bg-[#dbdbdb]",
          )}
        >
          {HERO_DEMO.images.slice(0, 6).map((src) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={60}
              height={60}
              className={cn(
                "aspect-square w-full object-cover",
                dark ? "bg-[#1a1a1a]" : "bg-white",
              )}
            />
          ))}
        </div>

        {scanning ? (
          <div
            className={cn(
              "mt-2 h-[2px] overflow-hidden rounded-full",
              dark ? "bg-white/10" : "bg-black/8",
            )}
          >
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 160, damping: 24 }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Instagram ─── */

function InstagramPage({
  locale,
  dark,
}: {
  locale: Locale;
  dark: boolean;
}) {
  return (
    <div
      dir="ltr"
      className={cn(
        "mx-auto max-w-md select-none px-5 pb-8 pt-5 md:px-6 md:pt-6",
        dark ? "text-white" : "text-[#0f0f0f]",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold tracking-tight">
          {HERO_DEMO.username}
        </p>
        <span className={cn("text-[11px]", dark ? "text-white/40" : "text-[#8e8e8e]")}>
          Instagram
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div
          className="rounded-full p-[2px]"
          style={{
            background:
              "conic-gradient(from 210deg, #f58529, #dd2a7b, #8134af, #515bd4, #f58529)",
          }}
        >
          <div
            className={cn(
              "rounded-full p-[2px]",
              dark ? "bg-black" : "bg-white",
            )}
          >
            <Image
              src={HERO_DEMO.avatar}
              alt=""
              width={72}
              height={72}
              className="size-[68px] rounded-full object-cover"
            />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 text-center">
          {[
            [HERO_DEMO.posts, "posts"],
            [HERO_DEMO.followers, "followers"],
            [HERO_DEMO.following, "following"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-[14px] font-semibold tabular-nums leading-none">
                {v}
              </p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  dark ? "text-white/45" : "text-[#737373]",
                )}
              >
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3.5 space-y-0.5 text-start">
        <p className="text-[13px] font-semibold">{HERO_DEMO.name}</p>
        <p className={cn("text-[11px]", dark ? "text-white/45" : "text-[#737373]")}>
          {HERO_DEMO.category[locale]}
        </p>
        <p className="whitespace-pre-line text-[12px] leading-[1.4]">
          {HERO_DEMO.bio[locale]}
        </p>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-1.5">
        <span className="flex h-8 items-center justify-center rounded-lg bg-[#0095f6] text-[12px] font-semibold text-white">
          Follow
        </span>
        <span
          className={cn(
            "flex h-8 items-center justify-center rounded-lg text-[12px] font-semibold",
            dark ? "bg-white/10 text-white" : "bg-[#efefef]",
          )}
        >
          Message
        </span>
      </div>

      <div
        className={cn(
          "mt-4 grid grid-cols-3 gap-px border-t",
          dark
            ? "border-white/10 bg-white/10"
            : "border-[#dbdbdb] bg-[#dbdbdb]",
        )}
      >
        {HERO_DEMO.images.map((src) => (
          <Image
            key={src}
            src={src}
            alt=""
            width={200}
            height={200}
            className={cn(
              "aspect-square w-full object-cover",
              dark ? "bg-[#1a1a1a]" : "bg-white",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Vitrin create ─── */

function VitrinCreate({
  dict,
  locale,
  pasted,
  building,
  inputRef,
  buildRef,
  scanning,
  scanItems,
  scanStep,
}: {
  dict: Dictionary;
  locale: Locale;
  pasted: boolean;
  building: boolean;
  inputRef: RefObject<HTMLDivElement | null>;
  buildRef: RefObject<HTMLButtonElement | null>;
  scanning: boolean;
  scanItems: string[];
  scanStep: number;
}) {
  const fa = locale === "fa";

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 md:min-h-[420px] md:px-10 md:py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 28%, rgba(255,107,87,0.1), transparent 68%)",
        }}
      />

      <AnimatePresence mode="wait">
        {scanning ? (
          <motion.div
            key="scan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative mt-28 w-full max-w-sm text-center md:mt-32"
          >
            <p className="type-label text-accent">
              {fa ? "هوش مصنوعی" : "AI"}
            </p>
            <p className="mt-2 text-[15px] font-medium text-foreground">
              {dict.hero.transform.analyzing}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {scanItems.map((item, i) => {
                const on = i <= scanStep;
                return (
                  <motion.span
                    key={item}
                    initial={false}
                    animate={{
                      opacity: on ? 1 : 0.35,
                      backgroundColor: on
                        ? "rgba(255,107,87,0.14)"
                        : "rgba(255,255,255,0.03)",
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] ring-1",
                      on
                        ? "text-accent ring-accent/25"
                        : "text-foreground-faint ring-white/8",
                    )}
                  >
                    {on ? <Check size={10} aria-hidden /> : null}
                    {item}
                  </motion.span>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative w-full max-w-md text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 text-foreground">
              <BrandMark className="size-5 text-accent" />
              <span className="text-[13px] font-semibold tracking-tight">
                {brandConfig.name}
              </span>
            </div>
            <h3 className="font-display text-[1.45rem] leading-tight tracking-tight text-foreground md:text-[1.7rem]">
              {fa
                ? "لینک پیجتو بده، سایتتو بگیر."
                : "Paste your Instagram. Get a website."}
            </h3>

            <div className="mt-6 text-start">
              <div
                ref={inputRef}
                className={cn(
                  "flex items-center gap-2 rounded-xl border bg-[#111113] px-3.5 py-3 transition-colors",
                  pasted ? "border-accent/35" : "border-white/10",
                )}
              >
                <span className="text-[13px] text-foreground-faint">@</span>
                <span
                  className={cn(
                    "flex-1 truncate text-[13px]",
                    pasted ? "text-foreground" : "text-foreground-faint",
                  )}
                >
                  {pasted ? IG_URL : dict.hero.placeholder}
                </span>
                {pasted ? (
                  <Check size={14} className="text-accent" aria-hidden />
                ) : null}
              </div>

              <button
                ref={buildRef}
                type="button"
                className={cn(
                  "mt-2.5 flex w-full items-center justify-center rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors",
                  building
                    ? "bg-accent/85 text-accent-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {building ? dict.hero.building : dict.hero.cta}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Built website — NOORAN fashion storefront ─── */

function BuiltWebsite({
  locale,
  revealStep,
  theme,
}: {
  locale: Locale;
  revealStep: number;
  theme: (typeof FASHION_THEME)["dark"] | (typeof FASHION_THEME)["light"];
}) {
  const fa = locale === "fa";
  const nav = fa
    ? ["جدید", "مجموعه", "درباره"]
    : ["New", "Shop", "About"];
  const products = HERO_DEMO.products;

  return (
    <div className="min-h-full transition-colors duration-500" style={{ background: theme.bg, color: theme.fg }}>
      <motion.header
        initial={false}
        animate={{ opacity: revealStep >= 0 ? 1 : 0, y: revealStep >= 0 ? 0 : -8 }}
        className="flex items-center justify-between px-5 py-3.5 md:px-8"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <p className="text-[12px] font-semibold tracking-[0.2em]">
          {HERO_DEMO.name}
        </p>
        <div className="hidden items-center gap-5 sm:flex">
          {nav.map((item) => (
            <span key={item} className="text-[11px]" style={{ color: theme.muted }}>
              {item}
            </span>
          ))}
        </div>
        <span
          className="rounded-md px-3 py-1.5 text-[10px] font-semibold"
          style={{ background: theme.accent, color: theme.accentFg }}
        >
          {HERO_DEMO.cta[locale]}
        </span>
      </motion.header>

      <section className="relative min-h-[260px] overflow-hidden md:min-h-[320px]">
        <motion.div
          initial={false}
          animate={{
            opacity: revealStep >= 1 ? 1 : 0,
            scale: revealStep >= 1 ? 1 : 1.04,
          }}
          transition={{ duration: 0.55 }}
          className="absolute inset-0"
        >
          <Image
            src={HERO_DEMO.images[0]}
            alt=""
            fill
            className="object-cover object-[center_20%]"
            sizes="800px"
            priority
          />
          <div className="absolute inset-0" style={{ background: theme.heroOverlay }} />
        </motion.div>

        <div className="relative flex min-h-[260px] flex-col justify-end px-5 pb-6 pt-16 md:min-h-[320px] md:px-8 md:pb-8">
          <motion.p
            initial={false}
            animate={{ opacity: revealStep >= 2 ? 1 : 0, y: revealStep >= 2 ? 0 : 8 }}
            className="text-[10px] tracking-[0.22em] text-white/65"
          >
            @{HERO_DEMO.username}
          </motion.p>
          <motion.h3
            initial={false}
            animate={{ opacity: revealStep >= 2 ? 1 : 0, y: revealStep >= 2 ? 0 : 10 }}
            className="mt-2 max-w-[14ch] font-display text-[1.8rem] leading-[1.05] tracking-[-0.03em] text-white md:text-[2.4rem]"
          >
            {HERO_DEMO.headline[locale]}
          </motion.h3>
          <motion.p
            initial={false}
            animate={{ opacity: revealStep >= 2 ? 1 : 0 }}
            className="mt-2 max-w-[34ch] text-[12px] leading-5 text-white/75 md:text-[13px]"
          >
            {HERO_DEMO.body[locale]}
          </motion.p>
          <motion.span
            initial={false}
            animate={{ opacity: revealStep >= 3 ? 1 : 0, y: revealStep >= 3 ? 0 : 8 }}
            className="mt-4 inline-flex w-fit rounded-md bg-white px-3.5 py-2 text-[11px] font-semibold text-[#1A1612]"
          >
            {HERO_DEMO.cta[locale]}
          </motion.span>
        </div>
      </section>

      <motion.section
        initial={false}
        animate={{ opacity: revealStep >= 4 ? 1 : 0, y: revealStep >= 4 ? 0 : 14 }}
        className="px-5 py-6 md:px-8 md:py-8"
      >
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em]" style={{ color: theme.muted }}>
              {fa ? "مجموعه بهار" : "Spring edit"}
            </p>
            <p className="mt-1 text-[14px] font-semibold tracking-tight md:text-[15px]">
              {fa ? "قطعه‌های ضروری" : "Essential pieces"}
            </p>
          </div>
          <span className="text-[11px]" style={{ color: theme.muted }}>
            {fa ? `${products.length} محصول` : `${products.length} products`}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-3.5">
          {products.map((product, i) => (
            <motion.article
              key={product.title.en}
              initial={false}
              animate={{
                opacity: revealStep >= 4 ? 1 : 0,
                y: revealStep >= 4 ? 0 : 12,
              }}
              transition={{ delay: i * 0.05 }}
              className="overflow-hidden rounded-lg"
              style={{ background: theme.card }}
            >
              <div
                className="relative aspect-[3/4] overflow-hidden"
                style={{ background: theme.surface }}
              >
                <Image
                  src={HERO_DEMO.images[i % HERO_DEMO.images.length]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="240px"
                />
                {product.tag ? (
                  <span
                    className="absolute start-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-medium text-white"
                    style={{ background: "rgba(0,0,0,0.72)" }}
                  >
                    {product.tag[locale]}
                  </span>
                ) : null}
              </div>
              <div className="px-2.5 py-2.5">
                <p className="truncate text-[11px] font-medium leading-tight">
                  {product.title[locale]}
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums" style={{ color: theme.muted }}>
                  {product.price[locale]}
                </p>
              </div>
            </motion.article>
          ))}
        </div>

        <div
          className="mt-8 pt-6 pb-4"
          style={{ borderTop: `1px solid ${theme.border}` }}
        >
          <p className="text-[10px] tracking-[0.2em]" style={{ color: theme.muted }}>
            {fa ? "داستان برند" : "Brand story"}
          </p>
          <p className="mt-2 max-w-[40ch] text-[13px] leading-6" style={{ color: theme.muted }}>
            {fa
              ? "نوران لباس‌هایی می‌سازد که برای شهر طراحی شده‌اند — آرام، دقیق، و بدون سروصدا."
              : "NOORAN makes clothes designed for the city — quiet, precise, and without noise."}
          </p>
        </div>
      </motion.section>
    </div>
  );
}

function DemoCursor({ cursor }: { cursor: Cursor }) {
  if (!cursor.visible) return null;
  return (
    <motion.div
      className="pointer-events-none absolute z-30"
      animate={{
        left: cursor.x,
        top: cursor.y,
        scale: cursor.pressing ? 0.82 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
      style={{ x: "-30%", y: "-20%" }}
      aria-hidden
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3.5l14.5 8.2-6.4 1.5-3.2 6.6L5 3.5z"
          fill="white"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1"
        />
      </svg>
    </motion.div>
  );
}

function StaticFallback({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-[var(--mkt-chrome)] ring-1 ring-border">
      <div className="flex items-center gap-2 border-b border-border bg-[var(--mkt-chrome-bar)] px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
        <span className="ms-2 flex-1 truncate rounded-md bg-background/55 px-3 py-1 font-mono text-[11px] text-foreground-muted">
          https://{HERO_DEMO.siteUrl}
        </span>
      </div>
      <div className="bg-[#0E0D0C] px-8 py-10 text-[#F6F1EA]">
        <p className="text-[10px] tracking-[0.28em] text-[#A59B90]">
          {HERO_DEMO.name}
        </p>
        <h3 className="mt-3 font-display text-3xl tracking-tight">
          {HERO_DEMO.headline[locale]}
        </h3>
        <p className="mt-3 max-w-md text-sm text-[#A59B90]">{dict.hero.subtitle}</p>
      </div>
    </div>
  );
}
