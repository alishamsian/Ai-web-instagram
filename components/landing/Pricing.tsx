"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Sparkles, forwardArrow } from "@/components/icons";
import { Zap } from "lucide-react";
import { pricing } from "@/lib/config/pricing";
import { localePath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

/** Compact premium pricing. */
export function Pricing({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.2, once: true });
  const reduce = useReducedMotion();
  const show = reduce || inView;
  const fa = locale === "fa";
  const Arrow = forwardArrow(locale);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <section
      id="pricing"
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
          <p className="type-label text-foreground-muted">{dict.pricing.eyebrow}</p>
          <h2 className="mt-3 text-balance font-display text-[1.65rem] leading-tight tracking-tight text-foreground md:text-[2rem]">
            {dict.pricing.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-pretty text-[13px] leading-6 text-foreground-secondary md:text-[14px] md:leading-7">
            {dict.pricing.body}
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ delay: reduce ? 0 : 0.05, duration: 0.35 }}
          className="mt-7 flex justify-center"
        >
          <div
            className="inline-flex items-center gap-0.5 rounded-full border border-border bg-[var(--mkt-panel)] p-0.5"
            role="group"
            aria-label={fa ? "دوره پرداخت" : "Billing period"}
          >
            {(
              [
                { id: "monthly" as const, label: fa ? "ماهانه" : "Monthly" },
                {
                  id: "yearly" as const,
                  label: fa ? "سالانه" : "Yearly",
                  hint: fa ? "−۲۰٪" : "−20%",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setBilling(option.id)}
                className={cn(
                  "relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors",
                  billing === option.id
                    ? "text-accent-foreground"
                    : "text-foreground-muted hover:text-foreground",
                )}
              >
                {billing === option.id ? (
                  <motion.span
                    layoutId="pricing-billing-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-[1]">{option.label}</span>
                {"hint" in option && option.hint ? (
                  <span
                    className={cn(
                      "relative z-[1] rounded-full px-1 py-px text-[8px] font-semibold",
                      billing === option.id
                        ? "bg-black/20 text-accent-foreground"
                        : "bg-muted text-foreground-faint",
                    )}
                  >
                    {option.hint}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-3 md:grid-cols-2 md:gap-4">
          {pricing.plans.map((plan, index) => {
            const featured = plan.featured;
            return (
              <motion.article
                key={plan.id}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                transition={{
                  delay: reduce ? 0 : 0.08 + index * 0.06,
                  duration: 0.45,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-[1.15rem] p-5",
                  featured
                    ? "bg-gradient-to-b from-accent/18 via-background-card to-background shadow-[0_0_48px_var(--mkt-glow)] ring-1 ring-accent/40"
                    : "bg-[var(--mkt-panel)] ring-1 ring-border",
                )}
              >
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-foreground">
                      {plan.name[locale]}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                        featured
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground-muted",
                      )}
                    >
                      {plan.badge[locale]}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex size-8 items-center justify-center rounded-lg ring-1",
                      featured
                        ? "bg-accent/20 text-accent ring-accent/30"
                        : "bg-muted text-foreground-muted ring-border",
                    )}
                  >
                    {featured ? <Sparkles size={14} aria-hidden /> : <Zap size={14} aria-hidden />}
                  </span>
                </div>

                <p className="relative mt-2 text-[12px] leading-5 text-foreground-muted">
                  {plan.description[locale]}
                </p>

                <div className="relative mt-5">
                  <p className="font-display text-[1.75rem] tracking-tight text-foreground md:text-[2rem]">
                    {plan.price === 0
                      ? fa
                        ? "رایگان"
                        : "Free"
                      : fa
                        ? "به‌زودی"
                        : "Soon"}
                  </p>
                  <p className="mt-1 text-[11px] text-foreground-faint">
                    {plan.period[locale]}
                    {featured && billing === "yearly" ? (
                      <span className="ms-1.5 text-accent">
                        {fa ? "· تخفیف سالانه" : "· yearly savings"}
                      </span>
                    ) : null}
                  </p>
                </div>

                <ul className="relative mt-5 flex-1 space-y-2">
                  {plan.features[locale].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-[12px] leading-5 text-foreground-secondary"
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full",
                          featured ? "bg-accent/20 text-accent" : "bg-muted text-foreground",
                        )}
                      >
                        <Check size={10} aria-hidden />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="relative mt-4 border-t border-border-subtle pt-3">
                  {plan.limits[locale].map((limit) => (
                    <p key={limit} className="text-[11px] text-foreground-faint">
                      {limit}
                    </p>
                  ))}
                </div>

                <Link
                  href={localePath(
                    locale,
                    plan.id === "pro" ? "/signup?plan=pro" : "/create",
                  )}
                  className={cn(
                    "relative mt-5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold transition-[transform,filter,background-color,opacity] duration-150 active:scale-[0.99]",
                    featured
                      ? "bg-accent text-accent-foreground hover:brightness-110"
                      : "bg-ink text-background hover:opacity-90",
                  )}
                >
                  {plan.cta[locale]}
                  <Arrow size={14} data-arrow aria-hidden />
                </Link>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: reduce ? 0 : 0.16, duration: 0.4 }}
          className="mx-auto mt-6 max-w-4xl"
        >
          <div className="overflow-hidden rounded-[1rem] border border-border bg-[var(--mkt-panel)]">
            <button
              type="button"
              onClick={() => setCompareOpen((open) => !open)}
              aria-expanded={compareOpen}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors hover:bg-[var(--mkt-panel-hover)]"
            >
              <div>
                <p className="text-[12px] font-semibold text-foreground">
                  {dict.pricing.compare}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-muted">
                  {compareOpen
                    ? dict.pricing.compareClose
                    : dict.pricing.compareOpen}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-muted ring-1 ring-border transition-transform duration-300",
                  compareOpen && "rotate-180 bg-accent/15 text-accent ring-accent/30",
                )}
              >
                <ChevronDown size={14} aria-hidden />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {compareOpen ? (
                <motion.div
                  key="compare-table"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-t border-border-subtle"
                >
                  <div className="overflow-hidden border-t border-border-subtle">
                    {/* Mobile: stacked feature cards */}
                    <div className="space-y-3 p-3 md:hidden">
                      {(
                        fa
                          ? [
                              ["ساخت از اینستاگرام", true, true],
                              ["ویرایش زنده", true, true],
                              ["دامنه اختصاصی", false, true],
                              ["حذف برند ویترین", false, true],
                              ["آمار و همگام‌سازی", false, "soon"],
                            ]
                          : [
                              ["Build from Instagram", true, true],
                              ["Live editing", true, true],
                              ["Custom domain", false, true],
                              ["Remove Vitrin brand", false, true],
                              ["Analytics & sync", false, "soon"],
                            ]
                      ).map(([label, starter, pro]) => (
                        <div
                          key={String(label)}
                          className="rounded-xl border border-border-subtle bg-background/40 px-3 py-3"
                        >
                          <p className="text-[12px] font-medium text-foreground-secondary">
                            {label}
                          </p>
                          <div className="mt-2.5 grid grid-cols-2 gap-2">
                            <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--mkt-panel)] px-2 py-2">
                              <span className="text-[10px] font-semibold text-accent">
                                {pricing.plans[0].name[locale]}
                              </span>
                              <CompareCell value={starter} soonLabel={dict.pricing.soon} />
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--mkt-panel)] px-2 py-2">
                              <span className="text-[10px] font-semibold text-foreground">
                                {pricing.plans[1].name[locale]}
                              </span>
                              <CompareCell value={pro} soonLabel={dict.pricing.soon} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                      <div className="grid grid-cols-[1.2fr_1fr_1fr]">
                        <div className="border-e border-border-subtle px-4 py-2 text-[11px] text-foreground-faint">
                          {dict.pricing.included}
                        </div>
                        <div className="border-e border-border-subtle px-4 py-2 text-center text-[11px] font-semibold text-accent">
                          {pricing.plans[0].name[locale]}
                        </div>
                        <div className="px-4 py-2 text-center text-[11px] font-semibold text-foreground">
                          {pricing.plans[1].name[locale]}
                        </div>

                        {(
                          fa
                            ? [
                                ["ساخت از اینستاگرام", true, true],
                                ["ویرایش زنده", true, true],
                                ["دامنه اختصاصی", false, true],
                                ["حذف برند ویترین", false, true],
                                ["آمار و همگام‌سازی", false, "soon"],
                              ]
                            : [
                                ["Build from Instagram", true, true],
                                ["Live editing", true, true],
                                ["Custom domain", false, true],
                                ["Remove Vitrin brand", false, true],
                                ["Analytics & sync", false, "soon"],
                              ]
                        ).map(([label, starter, pro]) => (
                          <div key={String(label)} className="contents">
                            <div className="border-t border-border-subtle px-4 py-2.5 text-[12px] text-foreground-secondary">
                              {label}
                            </div>
                            <div className="flex items-center justify-center border-t border-border-subtle px-4 py-2.5">
                              <CompareCell value={starter} soonLabel={dict.pricing.soon} />
                            </div>
                            <div className="flex items-center justify-center border-t border-border-subtle px-4 py-2.5">
                              <CompareCell value={pro} soonLabel={dict.pricing.soon} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="mx-auto mt-5 max-w-md text-center text-[12px] leading-5 text-foreground-muted">
          <span className="text-accent">{dict.pricing.guarantee}</span>
          <span className="mx-1.5 text-foreground-faint">·</span>
          {dict.pricing.note}
        </p>
      </div>
    </section>
  );
}

function CompareCell({
  value,
  soonLabel,
}: {
  value: boolean | string;
  soonLabel: string;
}) {
  if (value === true) {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check size={11} aria-hidden />
      </span>
    );
  }
  if (value === "soon") {
    return (
      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
        {soonLabel}
      </span>
    );
  }
  return <span className="text-[12px] text-foreground-faint">—</span>;
}
