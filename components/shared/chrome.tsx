"use client";

import { motion, useReducedMotion } from "motion/react";
import { Battery } from "lucide-react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function BrowserFrame({
  children,
  url,
  className,
}: {
  children: React.ReactNode;
  url?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-white shadow-[var(--elevated-lg)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-white px-4 py-2.5">
        <span className="size-2 rounded-full bg-[#d4d4d8]" aria-hidden />
        <span className="size-2 rounded-full bg-[#d4d4d8]" aria-hidden />
        <span className="size-2 rounded-full bg-[#d4d4d8]" aria-hidden />
        <div className="ms-3 flex-1 truncate rounded bg-[#f6f6f6] px-3 py-1 text-[11px] text-muted-foreground">
          {url}
        </div>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

export function PhoneMockup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative mx-auto w-[280px]", className)}
      dir="ltr"
      style={{ direction: "ltr" }}
    >
      <div
        className="relative overflow-hidden rounded-[2.4rem] bg-black p-[9px]"
        style={{
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.55), 0 18px 40px rgba(0,0,0,0.16)",
        }}
      >
        <div className="relative overflow-hidden rounded-[1.95rem] bg-white">
          {/* Clean Dynamic Island — physically centered */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-11" aria-hidden>
            <div
              className="absolute top-[11px] h-[26px] w-[96px] rounded-full bg-black"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <span
                className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                style={{
                  right: 14,
                  background:
                    "radial-gradient(circle at 35% 35%, #3a3a3c 0%, #1a1a1c 70%)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              />
            </div>
          </div>

          {/* Minimal status row under island */}
          <div className="relative z-20 grid h-11 grid-cols-[1fr_auto_1fr] items-end px-5 pb-[5px] text-[12px] font-semibold tracking-tight text-black">
            <span className="justify-self-start tabular-nums">9:41</span>
            <span className="w-[96px]" aria-hidden />
            <span className="justify-self-end opacity-90" aria-hidden>
              <Battery size={18} strokeWidth={1.8} />
            </span>
          </div>

          <div className="max-h-[500px] overflow-hidden bg-white">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect
        x="3"
        y="6"
        width="26"
        height="20"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect x="8" y="11" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}
