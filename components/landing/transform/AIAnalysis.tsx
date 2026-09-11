"use client";

import { motion } from "motion/react";
import { INSTAGRAM_DEMO_BRAND } from "@/lib/demo/instagram-demo";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

export function AIAnalysis({
  visible,
  className,
  locale = "en",
}: {
  visible: boolean;
  className?: string;
  locale?: Locale;
}) {
  const brand = INSTAGRAM_DEMO_BRAND;
  const fa = locale === "fa";
  const rows = [
    { label: fa ? "کسب‌وکار" : "Business", value: brand.signals.business },
    { label: fa ? "سبک" : "Style", value: brand.signals.style },
    { label: fa ? "محتوا" : "Content", value: brand.signals.content },
    { label: fa ? "لحن" : "Tone", value: brand.signals.tone },
  ];

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 12,
        scale: visible ? 1 : 0.98,
      }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "pointer-events-none mx-auto w-full max-w-sm rounded-[18px] border border-white/10 bg-[#111113]/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl",
        !visible && "invisible",
        className,
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />
          <span className="relative size-2 rounded-full bg-accent" />
        </span>
        <p className="text-[12px] font-medium tracking-wide text-accent">
          {fa ? "درک برند شما" : "Understanding your brand"}
        </p>
      </div>

      <ul className="mt-4 space-y-2.5">
        {rows.map((row, index) => (
          <motion.li
            key={row.label}
            initial={false}
            animate={
              visible
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -8 }
            }
            transition={{ delay: visible ? 0.08 + index * 0.08 : 0, duration: 0.35 }}
            className="flex items-center justify-between gap-3 rounded-[12px] bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.05]"
          >
            <span className="text-[11px] tracking-wide text-foreground-muted uppercase">
              {row.label}
            </span>
            <span className="text-[12px] font-medium text-foreground">{row.value}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
