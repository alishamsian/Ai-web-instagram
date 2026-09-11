"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { forwardArrow } from "@/components/icons";
import { localePath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

/** Closing CTA — headline + one button, no second URL form. */
export function FinalCTA({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  const reduce = useReducedMotion();
  const show = reduce || inView;
  const Arrow = forwardArrow(locale);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-t border-border-subtle bg-background"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute start-1/2 top-1/2 size-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--mkt-glow)] blur-[100px]"
        aria-hidden
      />

      <div className="container-marketing relative py-16 md:py-20">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-lg text-center"
        >
          <h2 className="whitespace-pre-line font-display text-balance text-[1.75rem] leading-[1.2] text-foreground md:text-[2.25rem]">
            {dict.final.title}
          </h2>
          <p className="mt-4 text-[14px] text-foreground-muted">{dict.final.micro}</p>
          <Link
            href={localePath(locale, "/create")}
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-semibold text-accent-foreground transition-[filter] hover:brightness-110"
          >
            {dict.final.cta}
            <Arrow size={16} data-arrow aria-hidden />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
