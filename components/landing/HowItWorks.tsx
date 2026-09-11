"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import {
  ICON_SIZE,
  IconAI,
  IconInstagram,
  IconWebsite,
  type LucideIcon,
} from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

const STEP_ICONS: LucideIcon[] = [IconInstagram, IconAI, IconWebsite];

export function HowItWorks({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-18% 0px" });
  const reduce = useReducedMotion();
  const show = reduce || inView;
  const [active, setActive] = useState(0);

  return (
    <section id="how" className="relative scroll-mt-24">
      <div className="absolute inset-0 bg-[#080808]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-transparent to-[#080808]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
        aria-hidden
      />

      <div ref={ref} className="container-marketing relative py-16 md:py-28 lg:py-32">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="type-label text-foreground-muted">
            {locale === "fa" ? "مسیر ساخت" : "The path"}
          </p>
          <h2 className="type-display-m mt-3 text-balance text-foreground md:mt-4">
            {dict.how.title}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-[14px] leading-6 text-foreground-secondary md:mt-5 md:text-base md:leading-8">
            {dict.how.body}
          </p>
        </motion.div>

        {/* Mobile: one-step carousel */}
        <div className="mt-10 md:hidden">
          <div className="mb-5 flex justify-center gap-2" role="tablist">
            {dict.how.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? IconWebsite;
              const on = active === index;
              return (
                <button
                  key={step.n}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(index)}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full ring-1 transition-colors",
                    on
                      ? "bg-accent text-accent-foreground ring-accent/40"
                      : "bg-white/[0.04] text-white/55 ring-white/10",
                  )}
                >
                  <Icon size={16} aria-hidden />
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            {dict.how.steps.map((step, index) => {
              if (index !== active) return null;
              const Icon = STEP_ICONS[index] ?? IconWebsite;
              return (
                <motion.div
                  key={step.n}
                  initial={reduce ? false : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -10 }}
                  transition={{ duration: 0.28 }}
                  className="mx-auto flex max-w-sm flex-col items-center text-center"
                >
                  <StepMarker index={index} show={show} reduce={!!reduce} Icon={Icon} />
                  <p className="type-label mt-5 text-accent">{step.n}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[17rem] text-sm leading-7 text-foreground-secondary">
                    {step.body}
                  </p>
                  <StepVisual
                    index={index}
                    locale={locale}
                    show={show}
                    reduce={!!reduce}
                    className="mt-6 w-full"
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="relative mt-16 hidden md:mt-20 md:block lg:mt-24">
          <div
            className="pointer-events-none absolute start-[16.5%] end-[16.5%] top-[52px] h-px"
            aria-hidden
          >
            <div className="h-full w-full bg-white/[0.08]" />
            <motion.div
              className="absolute inset-y-0 start-0 w-full origin-start bg-accent"
              initial={reduce ? false : { scaleX: 0 }}
              animate={show ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ delay: 0.25, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <ol className="grid gap-12 md:grid-cols-3 md:gap-8 lg:gap-12">
            {dict.how.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? IconWebsite;
              return (
                <motion.li
                  key={step.n}
                  initial={reduce ? false : { opacity: 0, y: 22 }}
                  animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
                  transition={{
                    delay: reduce ? 0 : 0.15 + index * 0.14,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative flex flex-col items-stretch text-start"
                >
                  <div className="relative z-[1] flex flex-col items-start">
                    <StepMarker
                      index={index}
                      show={show}
                      reduce={!!reduce}
                      Icon={Icon}
                    />
                    <p className="type-label mt-8 text-accent">{step.n}</p>
                    <h3 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-7 text-foreground-secondary">
                      {step.body}
                    </p>
                  </div>

                  <StepVisual
                    index={index}
                    locale={locale}
                    show={show}
                    reduce={!!reduce}
                    className="mt-10 w-full"
                  />
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepMarker({
  index,
  show,
  reduce,
  Icon,
}: {
  index: number;
  show: boolean;
  reduce: boolean;
  Icon: LucideIcon;
}) {
  return (
    <motion.div
      initial={reduce ? false : { scale: 0.86, opacity: 0 }}
      animate={show ? { scale: 1, opacity: 1 } : { scale: 0.86, opacity: 0 }}
      transition={{
        delay: reduce ? 0 : 0.28 + index * 0.14,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="relative flex size-[52px] items-center justify-center rounded-full bg-[#111113] ring-1 ring-white/12"
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full",
          index === 1 && "bg-accent/15 blur-md",
        )}
        aria-hidden
      />
      <Icon
        size={ICON_SIZE.lg}
        className={cn(index === 1 ? "text-accent" : "text-foreground-secondary")}
        aria-hidden
      />
    </motion.div>
  );
}

function StepVisual({
  index,
  locale,
  show,
  reduce,
  className,
}: {
  index: number;
  locale: Locale;
  show: boolean;
  reduce: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{
        delay: reduce ? 0 : 0.35 + index * 0.14,
        duration: 0.5,
      }}
      className={cn("relative overflow-hidden rounded-[1.1rem]", className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.045] to-transparent" />
      <div className="relative aspect-[16/10] bg-[#0c0c0e] ring-1 ring-inset ring-white/[0.07]">
        {index === 0 ? <PasteVisual locale={locale} /> : null}
        {index === 1 ? <UnderstandVisual locale={locale} /> : null}
        {index === 2 ? <ReadyVisual locale={locale} /> : null}
      </div>
    </motion.div>
  );
}

function PasteVisual({ locale }: { locale: Locale }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-5 py-5 sm:px-6">
      <div className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.04] px-3.5 py-3 ring-1 ring-white/[0.08]">
        <IconInstagram size={ICON_SIZE.md} className="shrink-0 text-foreground-muted" />
        <span className="truncate font-mono text-[12px] tracking-tight text-foreground-secondary sm:text-[13px]">
          instagram.com/yourbusiness
        </span>
        <span className="ms-auto hidden rounded-md bg-accent px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground sm:inline">
          {locale === "fa" ? "ادامه" : "Go"}
        </span>
      </div>
      <p className="text-start text-[11px] leading-5 text-foreground-faint">
        {locale === "fa"
          ? "همان لینکی که در بیو می‌گذاری."
          : "The same link already in your bio."}
      </p>
    </div>
  );
}

function UnderstandVisual({ locale }: { locale: Locale }) {
  const rows =
    locale === "fa"
      ? ["نوع کسب‌وکار", "سبک بصری", "محصولات", "لحن برند"]
      : ["Business type", "Visual style", "Products", "Brand tone"];

  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-5 py-5 sm:px-6">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-accent">
        <IconAI size={ICON_SIZE.sm} />
        <span>{locale === "fa" ? "در حال فهم برند" : "Reading the brand"}</span>
      </div>
      {rows.map((row, i) => (
        <div key={row} className="flex items-center gap-3">
          <span className="w-[5.5rem] shrink-0 text-start text-[11px] text-foreground-muted sm:w-28">
            {row}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-accent/80"
              initial={{ width: "18%" }}
              animate={{ width: `${68 + i * 8}%` }}
              transition={{
                delay: 0.5 + i * 0.12,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadyVisual({ locale }: { locale: Locale }) {
  return (
    <div className="flex h-full flex-col p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5 px-1 pb-2.5">
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="ms-2 truncate text-[10px] text-foreground-faint">
          {locale === "fa" ? "yoursite.vitrin.app" : "yoursite.vitrin.app"}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[10px] bg-[#141416] ring-1 ring-white/[0.06]">
        <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-br from-accent/25 via-sky-500/10 to-transparent" />
        <div className="absolute inset-x-4 top-[42%] space-y-2">
          <div className="h-2 w-[66%] rounded-full bg-white/25" />
          <div className="h-1.5 w-full rounded-full bg-white/10" />
          <div className="h-1.5 w-[80%] rounded-full bg-white/10" />
        </div>
        <div className="absolute inset-x-4 bottom-3 grid grid-cols-3 gap-2">
          <div className="aspect-square rounded-md bg-white/[0.07]" />
          <div className="aspect-square rounded-md bg-white/[0.07]" />
          <div className="aspect-square rounded-md bg-white/[0.07]" />
        </div>
      </div>
    </div>
  );
}
