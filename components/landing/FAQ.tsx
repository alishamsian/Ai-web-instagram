"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { forwardArrow } from "@/components/icons";
import { Plus } from "lucide-react";
import { localePath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

type FaqCategory = "all" | "product" | "billing" | "growth";

/** Compact premium FAQ. */
export function FAQ({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.2, once: true });
  const reduce = useReducedMotion();
  const show = reduce || inView;
  const Arrow = forwardArrow(locale);
  const [category, setCategory] = useState<FaqCategory>("all");
  const [openId, setOpenId] = useState<string | null>("0");

  const filters: { id: FaqCategory; label: string }[] = [
    { id: "all", label: dict.faq.all },
    { id: "product", label: locale === "fa" ? "محبوب" : "Popular" },
    { id: "billing", label: dict.faq.categories.billing },
    { id: "growth", label: dict.faq.categories.growth },
  ];

  const items = useMemo(() => {
    return dict.faq.items
      .map((item, index) => ({ ...item, id: String(index) }))
      .filter((item) => category === "all" || item.category === category);
  }, [category, dict.faq.items]);

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="relative scroll-mt-24 overflow-hidden bg-background"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
        aria-hidden
      />

      <div className="container-marketing relative py-16 md:py-20">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <p className="type-label text-foreground-muted">{dict.faq.eyebrow}</p>
          <h2 className="mt-3 text-balance font-display text-[1.65rem] leading-tight tracking-tight text-foreground md:text-[2rem]">
            {dict.faq.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-[13px] leading-6 text-foreground-secondary md:text-[14px] md:leading-7">
            {dict.faq.body}
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: reduce ? 0 : 0.05, duration: 0.35 }}
          className="mt-7 flex flex-wrap justify-center gap-2"
          role="tablist"
          aria-label={dict.faq.eyebrow}
        >
          {filters.map((filter) => {
            const active = category === filter.id;
            const mobileOnlyPopular =
              filter.id === "all" || filter.id === "product";
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setCategory(filter.id);
                  setOpenId(null);
                }}
                className={cn(
                  "relative min-h-11 rounded-full px-4 py-2 text-[12px] font-medium transition-colors",
                  !mobileOnlyPopular && "hidden sm:inline-flex",
                  mobileOnlyPopular && "inline-flex",
                  active
                    ? "text-accent-foreground"
                    : "text-foreground-muted hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={reduce ? undefined : "faq-filter-pill"}
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : (
                  <span className="absolute inset-0 rounded-full border border-border bg-[var(--mkt-panel)]" />
                )}
                <span className="relative z-[1]">{filter.label}</span>
              </button>
            );
          })}
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ delay: reduce ? 0 : 0.08, duration: 0.45 }}
          className="mx-auto mt-7 max-w-2xl space-y-2"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item, index) => {
              const open = openId === item.id;
              const categoryLabel =
                dict.faq.categories[
                  item.category as keyof typeof dict.faq.categories
                ];

              return (
                <motion.div
                  key={item.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "overflow-hidden rounded-[0.95rem] border transition-colors duration-250",
                    open
                      ? "border-accent/35 bg-accent/10"
                      : "border-border bg-[var(--mkt-panel)] hover:border-border-strong hover:bg-[var(--mkt-panel-hover)]",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex min-h-12 w-full items-center gap-3 px-3.5 py-3.5 text-start md:px-4"
                  >
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        open ? "text-accent" : "text-foreground-faint",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[9px] font-medium",
                            open
                              ? "bg-accent/20 text-accent"
                              : "bg-muted text-foreground-faint",
                          )}
                        >
                          {categoryLabel}
                        </span>
                        <p
                          className={cn(
                            "text-[13px] font-semibold leading-snug md:text-[14px]",
                            open ? "text-foreground" : "text-foreground-secondary",
                          )}
                        >
                          {item.q}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-250",
                        open
                          ? "rotate-45 bg-accent text-accent-foreground ring-accent"
                          : "bg-muted text-foreground-muted ring-border",
                      )}
                    >
                      <Plus size={12} aria-hidden />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key="answer"
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border-subtle px-3.5 pb-3.5 md:px-4">
                          <p className="ps-7 pt-2.5 text-[12px] leading-6 text-foreground-muted md:ps-8 md:text-[13px] md:leading-6">
                            {item.a}
                          </p>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[0.95rem] border border-border bg-[var(--mkt-panel)] px-4 py-3">
            <div className="min-w-0 text-start">
              <p className="text-[13px] font-semibold text-foreground">
                {dict.faq.moreTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-foreground-muted">
                {dict.faq.moreBody}
              </p>
            </div>
            <Link
              href={localePath(locale, "/create")}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-[12px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              {dict.faq.moreCta}
              <Arrow size={13} data-arrow aria-hidden />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
