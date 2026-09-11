"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { InstagramInput } from "@/components/landing/InstagramInput";
import { HeroTransformation } from "@/components/landing/HeroTransformation";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function Hero({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const reduce = useReducedMotion();

  return (
    <section id="start" className="relative z-10 overflow-hidden">
      <div className="container-marketing relative pb-16 pt-20 md:pb-24 md:pt-28 lg:pb-36 lg:pt-36">
        <div className="mx-auto max-w-[720px] text-center">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="type-label mb-4 text-accent md:mb-5"
          >
            {dict.brand}
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="type-display-xl text-balance text-foreground"
          >
            <span className="block">{dict.hero.titleLine1}</span>
            <span className="mt-1 block text-foreground-secondary md:mt-2">
              {dict.hero.titleLine2}
            </span>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.4 }}
            className="mt-3 text-[13px] text-foreground-muted md:mt-4 md:text-[14px]"
          >
            {dict.hero.eyebrow}
          </motion.p>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="mx-auto mt-4 max-w-[34rem] text-pretty text-[16px] leading-7 text-foreground-secondary md:mt-6 md:text-xl md:leading-8"
          >
            {dict.hero.subtitle}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            className="relative z-20 mx-auto mt-7 max-w-xl text-start md:mt-11"
          >
            <InstagramInput dict={dict} locale={locale} />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] leading-5 text-foreground-muted md:text-[13px]">
              <p>{dict.hero.micro}</p>
              <Link
                href={`/${locale}#dashboard`}
                className="text-foreground-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline lg:hidden"
              >
                {dict.hero.secondary}
              </Link>
              <Link
                href={`/${locale}#examples`}
                className="hidden text-foreground-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline lg:inline"
              >
                {dict.hero.secondary}
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 mt-10 md:mt-16 lg:mt-20">
          <HeroTransformation dict={dict} locale={locale} />
        </div>
      </div>

      {/* Soft handoff into the next solid section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 md:h-48 lg:h-56"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--background) 45%, transparent) 42%, color-mix(in srgb, var(--background) 88%, transparent) 72%, var(--background) 100%)",
        }}
      />
    </section>
  );
}
