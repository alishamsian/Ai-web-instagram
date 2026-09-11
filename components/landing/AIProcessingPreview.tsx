"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Sparkles } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

export function AIProcessingPreview({
  dict,
  className,
  active = true,
}: {
  dict: Dictionary;
  className?: string;
  active?: boolean;
}) {
  const reduce = useReducedMotion();
  const rows = [
    dict.hero.transform.business,
    dict.hero.transform.style,
    dict.hero.transform.content,
    dict.hero.transform.products,
    dict.hero.transform.tone,
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-white/10 bg-[#111113] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:p-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -end-8 -top-10 size-36 rounded-full bg-accent/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-3">
        <span className="relative inline-flex size-10 items-center justify-center rounded-[12px] bg-accent/15 text-accent ring-1 ring-accent/30">
          {!reduce && active ? (
            <motion.span
              className="absolute inset-0 rounded-[12px] bg-accent/25"
              animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              aria-hidden
            />
          ) : null}
          <Sparkles size={18} aria-hidden />
        </span>
        <div>
          <p className="type-label text-accent">AI</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {dict.hero.transform.analyzing}
          </p>
        </div>
      </div>

      <ul className="relative mt-5 space-y-2">
        {rows.map((row, index) => (
          <motion.li
            key={row}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={
              active
                ? { opacity: 1, x: 0 }
                : { opacity: 0.55, x: 0 }
            }
            transition={{ delay: 0.12 + index * 0.07, duration: 0.35 }}
            className="flex items-center gap-2.5 rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Check size={11} aria-hidden />
            </span>
            <span className="text-[13px] text-foreground-secondary">{row}</span>
            {!reduce && active ? (
              <motion.span
                className="ms-auto h-1 w-8 overflow-hidden rounded-full bg-white/10"
                aria-hidden
              >
                <motion.span
                  className="block h-full rounded-full bg-accent"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    delay: 0.2 + index * 0.1,
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </motion.span>
            ) : null}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
