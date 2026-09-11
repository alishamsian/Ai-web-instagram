"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, IconInstagram, IconWebsite } from "@/components/icons";
import { Section, SectionHeading } from "@/components/shared/section";
import { InstagramPreview } from "@/components/shared/InstagramPreview";
import { DEMO_POSTS } from "@/lib/demo/store";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function BeforeAfter({
  dict,
  locale = "fa",
}: {
  dict: Dictionary;
  locale?: Locale;
}) {
  const [amount, setAmount] = useState(54);
  const frame = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const move = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setAmount(Math.min(94, Math.max(6, next)));
  }, []);

  return (
    <Section className="border-t border-border">
      <SectionHeading title={dict.beforeAfter.title} align="center" />
      <div
        ref={frame}
        className="relative mx-auto mt-10 aspect-[16/11] max-w-4xl touch-none overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[var(--elevated-lg)] select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0) return;
          move(event.clientX);
        }}
      >
        <div className="absolute inset-0 bg-[#F5F0EA] p-5 md:p-10" aria-hidden={amount > 90}>
          <div className="absolute end-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <IconWebsite size={12} aria-hidden />
            {dict.beforeAfter.right}
          </div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground">NOORAN</p>
          <h3 className="mt-3 max-w-md font-display text-3xl md:text-5xl">
            {locale === "fa" ? "لباس آرام برای شهر شلوغ." : "Quiet clothes for a loud city."}
          </h3>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {DEMO_POSTS.slice(0, 3).map((post) => (
              <Image
                key={post.id}
                src={post.displayUrl ?? ""}
                alt=""
                width={240}
                height={280}
                className="h-28 w-full object-cover md:h-40"
              />
            ))}
          </div>
        </div>

        <div
          className="absolute inset-0 overflow-hidden bg-white"
          style={{ width: `${amount}%` }}
          aria-hidden={amount < 10}
        >
          <div className="h-full w-full min-w-[320px] overflow-hidden md:absolute md:inset-0 md:min-w-full">
            <div className="absolute start-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <IconInstagram size={12} aria-hidden />
              {dict.beforeAfter.left}
            </div>
            <div className="mx-auto h-full max-w-[340px] overflow-hidden border-x border-[#dbdbdb] bg-white">
              <InstagramPreview locale={locale} compact />
            </div>
          </div>
        </div>

        <div className="absolute inset-y-0 z-10 w-px bg-ink" style={{ left: `${amount}%` }}>
          <div
            role="slider"
            tabIndex={0}
            aria-valuemin={6}
            aria-valuemax={94}
            aria-valuenow={Math.round(amount)}
            aria-labelledby={labelId}
            aria-orientation="horizontal"
            className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-0 rounded-full border border-border bg-white text-ink shadow-[var(--elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault();
                setAmount((value) => Math.max(6, value - 4));
              }
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault();
                setAmount((value) => Math.min(94, value + 4));
              }
              if (event.key === "Home") {
                event.preventDefault();
                setAmount(6);
              }
              if (event.key === "End") {
                event.preventDefault();
                setAmount(94);
              }
            }}
          >
            <ChevronLeft size={14} aria-hidden />
            <ChevronRight size={14} aria-hidden />
          </div>
        </div>
        <span id={labelId} className="sr-only">
          {dict.beforeAfter.left} / {dict.beforeAfter.right}
        </span>
      </div>
    </Section>
  );
}
