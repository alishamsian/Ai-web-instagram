"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  IconBeauty,
  IconCreator,
  IconFashion,
  IconRestaurant,
  IconServicesCategory,
  IconWebsite,
} from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionary";

const NICHE_ICONS = [
  IconFashion,
  IconRestaurant,
  IconBeauty,
  IconServicesCategory,
  IconCreator,
  IconWebsite,
] as const;

/** Cinematic handoff after hero — manifesto, not SaaS stats. */
export function SocialProof({ dict }: { dict: Dictionary }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  const reduce = useReducedMotion();
  const show = reduce || inView;

  const niches = dict.social.items.map((label, i) => ({
    label,
    Icon: NICHE_ICONS[i % NICHE_ICONS.length],
  }));
  const loop = [...niches, ...niches, ...niches];

  return (
    <section
      ref={ref}
      className="relative -mt-8 overflow-hidden border-b border-border-subtle bg-background md:-mt-14 lg:-mt-20"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -start-20 top-1/2 size-[22rem] -translate-y-1/2 rounded-full bg-[var(--mkt-glow)] blur-[110px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-24 top-0 size-[18rem] rounded-full bg-[#dd2a7b]/10 blur-[100px]"
        aria-hidden
      />

      <div className="relative pb-11 pt-6 md:pb-14 md:pt-8">
        <div className="container-marketing">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="type-label text-accent">{dict.social.eyebrow}</p>

            <h2 className="mt-4 text-balance font-display tracking-[-0.04em]">
              <motion.span
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ delay: reduce ? 0 : 0.06, duration: 0.5 }}
                className="block text-[clamp(1.85rem,5.5vw,3.4rem)] leading-[1.08] text-foreground-secondary"
              >
                {dict.social.line1}
              </motion.span>
              <motion.span
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ delay: reduce ? 0 : 0.14, duration: 0.55 }}
                className="mt-1 block text-[clamp(1.85rem,5.5vw,3.4rem)] leading-[1.08] text-foreground"
              >
                {dict.social.line2}
              </motion.span>
            </h2>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: reduce ? 0 : 0.22, duration: 0.45 }}
              className="mx-auto mt-5 max-w-xl text-pretty text-[14px] leading-7 text-foreground-muted md:mt-6 md:text-[15px] md:leading-8"
            >
              {dict.social.body}
            </motion.p>
          </motion.div>
        </div>

        {/* Dual-speed niche river */}
        <div className="relative mt-9 space-y-2.5 md:mt-11">
          <div
            className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-12 bg-gradient-to-r from-background to-transparent sm:w-20 md:w-28"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 end-0 z-[1] w-12 bg-gradient-to-l from-background to-transparent sm:w-20 md:w-28"
            aria-hidden
          />

          <MarqueeRow
            items={loop}
            reverse={false}
            duration={32}
            reduce={!!reduce}
            show={show}
            tone="loud"
          />
          <MarqueeRow
            items={[...loop].reverse()}
            reverse
            duration={40}
            reduce={!!reduce}
            show={show}
            tone="soft"
          />
        </div>
      </div>
    </section>
  );
}

function MarqueeRow({
  items,
  reverse,
  duration,
  reduce,
  show,
  tone,
}: {
  items: { label: string; Icon: (typeof NICHE_ICONS)[number] }[];
  reverse?: boolean;
  duration: number;
  reduce: boolean;
  show: boolean;
  tone: "loud" | "soft";
}) {
  return (
    <div
      className={
        tone === "loud"
          ? "overflow-hidden border-y border-border-subtle bg-[var(--mkt-panel)] py-3 md:py-3.5"
          : "overflow-hidden py-2 opacity-70"
      }
    >
      <motion.div
        className="flex w-max gap-8 md:gap-10"
        animate={
          reduce || !show
            ? undefined
            : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }
        }
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {items.map((niche, index) => (
          <span
            key={`${niche.label}-${index}-${tone}`}
            className="inline-flex items-center gap-2.5 whitespace-nowrap text-[13px] text-foreground-secondary md:text-[14px]"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent/12 text-accent ring-1 ring-accent/20 md:size-8">
              <niche.Icon size={13} aria-hidden />
            </span>
            {niche.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
