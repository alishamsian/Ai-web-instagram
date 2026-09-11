"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { HERO_DEMO } from "@/lib/demo/hero";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/config/env";

export function GeneratedWebsitePreview({
  locale,
  className,
  reveal = true,
}: {
  locale: Locale;
  className?: string;
  reveal?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-white/10 bg-[#F7F3EE] text-[#1a1412] shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-black/8 bg-[#1a1a1c] px-3 py-2.5">
        <span className="size-2 rounded-full bg-[#FF5F57]" aria-hidden />
        <span className="size-2 rounded-full bg-[#FEBC2E]" aria-hidden />
        <span className="size-2 rounded-full bg-[#28C840]" aria-hidden />
        <span className="ms-2 min-w-0 flex-1 truncate rounded-md bg-black/35 px-2.5 py-1 text-center font-mono text-[10px] text-white/65">
          https://{HERO_DEMO.siteUrl}
        </span>
      </div>

      <div className="px-5 pb-5 pt-5 md:px-6">
        <motion.p
          initial={false}
          animate={{ opacity: reveal ? 1 : 0.7 }}
          className="text-[10px] tracking-[0.22em] text-[#8a7f7a]"
        >
          {HERO_DEMO.name}
        </motion.p>
        <motion.h3
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0.85, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mt-2.5 max-w-[16ch] font-display text-[1.55rem] leading-[1.05] tracking-[-0.03em] md:text-[1.75rem]"
        >
          {HERO_DEMO.headline[locale]}
        </motion.h3>
        <p className="mt-2.5 max-w-[34ch] text-[12px] leading-5 text-[#6b635f] md:text-[13px] md:leading-6">
          {HERO_DEMO.body[locale]}
        </p>
        <span className="mt-3.5 inline-flex rounded-[10px] bg-[#1a1412] px-3.5 py-2 text-[12px] font-medium text-white">
          {HERO_DEMO.cta[locale]}
        </span>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {HERO_DEMO.images.slice(0, 3).map((src, index) => (
            <motion.div
              key={src}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0.75, y: 0 }}
              transition={{ delay: 0.08 + index * 0.06, duration: 0.4 }}
              className="overflow-hidden rounded-lg"
            >
              <Image
                src={src}
                alt=""
                width={180}
                height={220}
                className="aspect-[4/5] w-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
