"use client";

import { createElement, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import { Check } from "lucide-react";
import type { ImportJob, ImportJobStage } from "@/types/jobs";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { Button } from "@/components/ui/button";
import {
  IconAI,
  IconAnalyzing,
  IconInstagram,
  IconProducts,
  IconWebsite,
  forwardArrow,
  type AppIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  importClientTimeoutMs,
  importTypicalMinutes,
} from "@/lib/config/import";

const STAGE_ORDER: ImportJobStage[] = [
  "connecting",
  "profile_found",
  "reading_content",
  "posts_imported",
  "understanding_brand",
  "creating_website",
  "ready",
];

const STAGE_ICON: Record<ImportJobStage, AppIcon> = {
  connecting: IconInstagram,
  profile_found: IconInstagram,
  reading_content: IconAnalyzing,
  posts_imported: IconProducts,
  understanding_brand: IconAI,
  creating_website: IconWebsite,
  ready: IconWebsite,
};

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ImportProgress({
  jobId,
  locale,
  postsLimit: postsLimitProp,
}: {
  jobId: string;
  locale: Locale;
  /** Known from create URL before the job payload loads. */
  postsLimit?: number;
}) {
  const dict = getDictionary(locale);
  const reduce = useReducedMotion();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [doneWebsiteId, setDoneWebsiteId] = useState<string | null>(null);
  const [finalElapsedMs, setFinalElapsedMs] = useState(0);
  const startedAtRef = useRef(0);
  const effectivePosts =
    job?.postsLimit && job.postsLimit > 0
      ? job.postsLimit
      : postsLimitProp && postsLimitProp > 0
        ? postsLimitProp
        : undefined;
  const timeoutMsRef = useRef(importClientTimeoutMs(effectivePosts));

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [jobId]);

  useEffect(() => {
    timeoutMsRef.current = importClientTimeoutMs(effectivePosts);
  }, [effectivePosts]);

  useEffect(() => {
    let active = true;
    const wallStart = Date.now();

    async function tick() {
      if (!active) return;
      if (Date.now() - wallStart > timeoutMsRef.current) {
        setTimedOut(true);
        return;
      }

      try {
        const response = await fetch(`/api/import/${jobId}`);
        if (!active) return;
        if (response.status === 401) {
          setPollError(dict.errors.scrapeFailed);
          return "stop";
        }
        if (!response.ok) {
          setPollError(dict.errors.scrapeFailed);
          return;
        }
        const data = (await response.json()) as ImportJob;
        setJob(data);
        setPollError(null);
        if (data.status === "completed" && data.websiteId) {
          setFinalElapsedMs(Date.now() - startedAtRef.current);
          setDoneWebsiteId(data.websiteId);
          return "stop";
        }
        if (data.status === "failed") {
          return "stop";
        }
      } catch {
        if (active) setPollError(dict.errors.scrapeFailed);
      }
    }

    let timer = 0;
    async function loop() {
      const result = await tick();
      if (!active || result === "stop" || timedOut) return;
      timer = window.setTimeout(loop, 900);
    }
    loop();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [jobId, locale, dict.errors.scrapeFailed, timedOut]);

  useEffect(() => {
    if (
      timedOut ||
      job?.status === "failed" ||
      job?.status === "completed" ||
      doneWebsiteId
    )
      return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
    return () => window.clearInterval(id);
  }, [timedOut, job?.status, doneWebsiteId]);

  useEffect(() => {
    if (reduce || timedOut || job?.status === "failed" || doneWebsiteId) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % dict.create.buildingTips.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [
    dict.create.buildingTips.length,
    reduce,
    timedOut,
    job?.status,
    doneWebsiteId,
  ]);

  const labels: Record<ImportJobStage, string> = {
    connecting: dict.importUi.connecting,
    profile_found: dict.importUi.profileFound,
    reading_content: dict.importUi.reading,
    posts_imported: dict.importUi.postsImported,
    understanding_brand: dict.importUi.understanding,
    creating_website: dict.importUi.creating,
    ready: dict.importUi.ready,
  };

  const details = dict.create.stageDetail;
  const fromCache = job?.collector === "cache";
  const currentIndex = job ? Math.max(0, STAGE_ORDER.indexOf(job.stage)) : 0;
  const currentStage = STAGE_ORDER[currentIndex] ?? "connecting";
  const failed = job?.status === "failed" || timedOut || Boolean(pollError);
  const errorMessage =
    job?.errorMessage ??
    (timedOut ? dict.errors.rateLimited : null) ??
    pollError;

  const progress = Math.min(
    0.98,
    (currentIndex + (job?.status === "completed" || doneWebsiteId ? 1 : 0.42)) /
      STAGE_ORDER.length,
  );

  const ActiveIcon = STAGE_ICON[currentStage];
  const typicalMinutes = importTypicalMinutes(effectivePosts);
  const typicalLabel = dict.create.buildingTypical.replace(
    "{minutes}",
    String(typicalMinutes),
  );

  if (doneWebsiteId) {
    return (
      <main className="relative min-h-[70dvh] overflow-hidden">
        <div className="fixed inset-0 z-0 bg-background" aria-hidden />
        <div className="container-marketing relative z-[1] flex min-h-[70dvh] items-center justify-center pb-16 pt-10 md:pb-24 md:pt-16">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-lg text-center"
          >
            <motion.div
              initial={reduce ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.08, type: "spring", stiffness: 280, damping: 18 }}
              className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_12px_40px_-12px_rgba(255,107,87,0.7)]"
            >
              <Check size={28} strokeWidth={2.5} aria-hidden />
            </motion.div>

            <p className="type-label mt-7 text-accent">{dict.create.successEyebrow}</p>
            <h1 className="type-display-m mt-3 text-balance text-foreground">
              {dict.create.successTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-foreground-muted">
              {dict.create.successBody}
            </p>

            <p className="mt-6 font-mono text-[13px] tabular-nums text-foreground-secondary">
              <span className="text-foreground-faint">{dict.create.successElapsed}</span>
              {" · "}
              {formatElapsed(finalElapsedMs || elapsedMs)}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="accent" size="xl" className="min-h-12 rounded-xl px-7">
                <a href={`/${locale}/editor/${doneWebsiteId}`}>
                  {dict.create.successCta}
                  {createElement(forwardArrow(locale), {
                    size: 16,
                    "aria-hidden": true,
                  })}
                </a>
              </Button>
              <Button asChild variant="soft" size="lg" className="rounded-xl">
                <a href={`/${locale}/sites`}>{dict.create.successSecondary}</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden">
      <div className="fixed inset-0 z-0 bg-background" aria-hidden />
      <div className="container-marketing relative z-[1] pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="type-label text-accent"
          >
            {dict.brand}
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.05, duration: 0.45 }}
            className="type-display-m mt-3 text-balance text-foreground"
          >
            {fromCache ? dict.importUi.fromCache : dict.create.buildingTitle}
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.1 }}
            className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-foreground-muted"
          >
            {fromCache ? dict.dashboard.cached : dict.create.buildingBody}
          </motion.p>
        </div>

        {!fromCache && !failed ? (
          <div className="mx-auto mt-10 grid max-w-5xl gap-10 lg:mt-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-14">
            {/* Timer column */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.12, duration: 0.5 }}
              className="flex flex-col items-center"
            >
              <BuildTimer
                progress={progress}
                elapsedLabel={formatElapsed(elapsedMs)}
                caption={dict.create.buildingElapsed}
                typical={typicalLabel}
                reduce={!!reduce}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="mt-8 w-full max-w-sm rounded-2xl border border-border-strong/70 bg-[#0a0a0a]/55 px-5 py-4 text-center backdrop-blur-md"
                >
                  <div className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                    <ActiveIcon size={20} aria-hidden />
                  </div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                    {dict.create.stageStatus.active}
                  </p>
                  <p className="mt-1.5 text-[16px] font-semibold text-foreground md:text-[17px]">
                    {labels[currentStage]}
                    {currentStage === "posts_imported" && job?.postsImported
                      ? ` · ${job.postsImported}`
                      : ""}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-foreground-muted">
                    {details[currentStage]}
                  </p>
                </motion.div>
              </AnimatePresence>

              <p className="mt-5 max-w-xs text-center text-[12px] leading-5 text-foreground-faint">
                {dict.create.buildingHold}
              </p>

              {/* Rotating tip */}
              <div className="mt-6 w-full max-w-sm overflow-hidden rounded-xl border border-border-subtle bg-background/30 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-faint">
                  {dict.create.buildingTipLabel}
                </p>
                <div className="relative mt-1.5 min-h-[2.75rem]">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIndex}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-x-0 text-[13px] leading-6 text-foreground-secondary"
                    >
                      {dict.create.buildingTips[tipIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Stages timeline */}
            <motion.ol
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.18, duration: 0.5 }}
              className="relative space-y-0"
            >
              {STAGE_ORDER.map((stage, index) => {
                const done =
                  index < currentIndex || job?.status === "completed";
                const activeStage =
                  index === currentIndex && job?.status !== "failed";
                const pending = !done && !activeStage;
                const Icon = STAGE_ICON[stage];
                const status = done
                  ? dict.create.stageStatus.done
                  : activeStage
                    ? dict.create.stageStatus.active
                    : dict.create.stageStatus.next;

                return (
                  <li key={stage} className="relative flex gap-4 pb-5 last:pb-0">
                    {index < STAGE_ORDER.length - 1 ? (
                      <span
                        className={cn(
                          "absolute start-[15px] top-8 h-[calc(100%-0.5rem)] w-px",
                          done ? "bg-accent/50" : "bg-border",
                        )}
                        aria-hidden
                      />
                    ) : null}

                    <span
                      className={cn(
                        "relative z-[1] mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition-colors duration-300",
                        done &&
                          "bg-accent text-accent-foreground ring-accent",
                        activeStage &&
                          "bg-accent/20 text-accent ring-accent/45",
                        pending &&
                          "bg-muted text-foreground-faint ring-border",
                      )}
                    >
                      {done ? (
                        <Check size={14} strokeWidth={2.5} aria-hidden />
                      ) : activeStage && !reduce ? (
                        <motion.span
                          className="absolute inset-0 rounded-full border border-accent/40"
                          animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                      ) : null}
                      {!done ? <Icon size={14} aria-hidden /> : null}
                    </span>

                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-xl border px-4 py-3 transition-[border-color,background-color,opacity] duration-300",
                        activeStage
                          ? "border-accent/35 bg-accent/8"
                          : done
                            ? "border-border-subtle bg-background/20"
                            : "border-transparent bg-transparent opacity-55",
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p
                          className={cn(
                            "text-[14px] font-semibold md:text-[15px]",
                            activeStage || done
                              ? "text-foreground"
                              : "text-foreground-muted",
                          )}
                        >
                          {labels[stage]}
                          {stage === "posts_imported" &&
                          job?.postsImported &&
                          (done || activeStage)
                            ? ` · ${job.postsImported}`
                            : ""}
                        </p>
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            done && "text-accent",
                            activeStage && "text-accent",
                            pending && "text-foreground-faint",
                          )}
                        >
                          {status}
                        </span>
                      </div>
                      <AnimatePresence initial={false}>
                        {(activeStage || done) && (
                          <motion.p
                            key={`${stage}-detail`}
                            initial={
                              reduce ? false : { opacity: 0, height: 0 }
                            }
                            animate={{ opacity: 1, height: "auto" }}
                            exit={
                              reduce ? undefined : { opacity: 0, height: 0 }
                            }
                            className="mt-1.5 overflow-hidden text-[12.5px] leading-6 text-foreground-muted md:text-[13px]"
                          >
                            {details[stage]}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </li>
                );
              })}
            </motion.ol>
          </div>
        ) : null}

        {failed ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-12 max-w-md text-center"
            role="alert"
          >
            <p className="text-[15px] font-medium text-accent">{errorMessage}</p>
            <p className="mt-2 text-[13px] text-foreground-muted">
              {dict.errors.retry}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild variant="contrast">
                <a
                  href={`/${locale}/create?url=${encodeURIComponent(job?.sourceUrl ?? "instagram.com/demo")}&refresh=1`}
                >
                  {dict.errors.retry}
                </a>
              </Button>
              <Button variant="soft" asChild>
                <a href={`/${locale}/create?url=instagram.com/demo`}>
                  {dict.errors.useDemo}
                </a>
              </Button>
              <Button variant="ghost-dark" asChild>
                <a href={`/${locale}/sites`}>{dict.nav.sites}</a>
              </Button>
            </div>
          </motion.div>
        ) : null}

        {job?.sourceUrl && !failed ? (
          <p
            className="mx-auto mt-10 max-w-lg truncate text-center font-mono text-[11px] text-foreground-faint"
            dir="ltr"
          >
            {job.sourceUrl}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function BuildTimer({
  progress,
  elapsedLabel,
  caption,
  typical,
  reduce,
}: {
  progress: number;
  elapsedLabel: string;
  caption: string;
  typical: string;
  reduce: boolean;
}) {
  const size = 168;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0.04, progress)));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="text-accent"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {!reduce ? (
        <motion.span
          className="pointer-events-none absolute inset-[18%] rounded-full bg-accent/10 blur-xl"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-foreground-faint">
          {caption}
        </p>
        <p
          className="mt-1 font-mono text-[2rem] font-semibold tabular-nums tracking-tight text-foreground md:text-[2.15rem]"
          aria-live="polite"
        >
          {elapsedLabel}
        </p>
        <p className="mt-1 max-w-[7.5rem] text-[11px] leading-4 text-foreground-muted">
          {typical}
        </p>
      </div>
    </div>
  );
}
