"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { forwardArrow } from "@/components/icons";
import { localePath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

/** Thin sticky CTA after scrolling past the hero — mobile only. */
export function MobileStickyCta({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const [show, setShow] = useState(false);
  const Arrow = forwardArrow(locale);

  useEffect(() => {
    const hero = document.getElementById("start");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting);
      },
      { threshold: 0.12, rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 transition-[opacity,transform] duration-300 md:hidden",
        show
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0",
      )}
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      aria-hidden={!show}
    >
      <Link
        href={localePath(locale, "/create")}
        tabIndex={show ? 0 : -1}
        className={cn(
          "pointer-events-auto flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[14px] font-semibold text-accent-foreground shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-accent/40",
          !show && "pointer-events-none",
        )}
      >
        {dict.nav.cta}
        <Arrow size={16} data-arrow aria-hidden />
      </Link>
    </div>
  );
}
