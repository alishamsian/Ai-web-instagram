"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Brand, BrandMark } from "@/components/landing/Brand";
import { IconAI, IconInstagram, IconWebsite, ArrowUpRight } from "@/components/icons";
import { ChevronDown } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

/**
 * Marketing footer — dark, branded, compact, distinctive.
 */
export function Footer({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.15, once: true });
  const reduce = useReducedMotion();
  const show = reduce || inView;
  const year = new Date().getFullYear();
  const [openCol, setOpenCol] = useState<string | null>(null);

  const columns = [
    {
      title: dict.footer.product,
      links: [
        { href: `/${locale}#start`, label: dict.footer.how },
        { href: `/${locale}#examples`, label: dict.footer.examples },
        { href: `/${locale}#dashboard`, label: dict.footer.dashboard },
        { href: `/${locale}#pricing`, label: dict.footer.pricing },
        { href: `/${locale}#faq`, label: dict.footer.faq },
      ],
    },
    {
      title: dict.footer.resources,
      links: [
        { href: `/${locale}/help`, label: dict.footer.help },
        { href: `/${locale}/blog`, label: dict.footer.blog },
        { href: `/${locale}/guides`, label: dict.footer.guides },
        { href: `/${locale}/sites`, label: dict.nav.sites },
      ],
    },
    {
      title: dict.footer.company,
      links: [
        { href: `/${locale}/about`, label: dict.footer.about },
        { href: `/${locale}/contact`, label: dict.footer.contact },
        { href: `/${locale}/privacy`, label: dict.footer.privacy },
        { href: `/${locale}/terms`, label: dict.footer.terms },
      ],
    },
  ];

  const story = [
    { icon: IconInstagram, label: locale === "fa" ? "اینستا" : "Instagram" },
    { icon: IconAI, label: locale === "fa" ? "هوش مصنوعی" : "AI" },
    { icon: IconWebsite, label: locale === "fa" ? "وب‌سایت" : "Website" },
  ] as const;

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden border-t border-border bg-background"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-accent/[0.06] to-transparent"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-6 select-none overflow-hidden px-4 text-center"
        aria-hidden
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[clamp(3.5rem,14vw,9rem)] leading-none tracking-[-0.04em] text-foreground/[0.04]"
        >
          {dict.brand}
        </motion.p>
      </div>

      <div className="container-marketing relative pt-14 pb-8 md:pt-16 md:pb-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12"
        >
          <div className="max-w-sm">
            <Brand
              href={`/${locale}`}
              name={dict.brand}
              className="text-foreground"
              markClassName="text-accent"
            />
            <p className="mt-3 text-[13px] leading-6 text-foreground-muted">
              {dict.footer.tagline}
            </p>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-[var(--mkt-panel)] px-2.5 py-1.5">
              {story.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="contents">
                    {index > 0 ? (
                      <span className="text-[10px] text-foreground-faint" aria-hidden>
                        →
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] text-foreground-secondary">
                      <Icon size={11} className="text-accent" aria-hidden />
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              href={`/${locale}/create`}
              className="mt-6 inline-flex h-11 min-h-11 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.99]"
            >
              {dict.nav.cta}
              <ArrowUpRight size={13} aria-hidden />
            </Link>
          </div>

          <div className="flex-1 space-y-1 sm:hidden">
            {columns.map((column) => {
              const open = openCol === column.title;
              return (
                <div
                  key={column.title}
                  className="overflow-hidden rounded-xl border border-border bg-[var(--mkt-panel)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCol((current) =>
                        current === column.title ? null : column.title,
                      )
                    }
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-start"
                    aria-expanded={open}
                  >
                    <span className="text-[12px] font-semibold tracking-wide text-foreground">
                      {column.title}
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-foreground-muted transition-transform",
                        open && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {open ? (
                    <ul className="space-y-1 border-t border-border-subtle px-2 pb-3 pt-1">
                      {column.links.map((link) => (
                        <li
                          key={link.href}
                          className={link.href.includes("#examples") ? "hidden lg:list-item" : undefined}
                        >
                          <Link
                            href={link.href}
                            className="flex min-h-11 items-center rounded-lg px-2 text-[13px] text-foreground-muted hover:bg-muted hover:text-foreground"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="hidden flex-1 grid-cols-3 gap-6 sm:grid lg:max-w-xl">
            {columns.map((column, colIndex) => (
              <motion.div
                key={column.title}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{
                  delay: reduce ? 0 : 0.08 + colIndex * 0.05,
                  duration: 0.4,
                }}
              >
                <p className="text-[11px] font-medium tracking-[0.14em] text-foreground-faint uppercase">
                  {column.title}
                </p>
                <ul className="mt-3 space-y-1">
                  {column.links.map((link) => (
                    <li
                      key={link.href}
                      className={link.href.includes("#examples") ? "hidden lg:list-item" : undefined}
                    >
                      <Link
                        href={link.href}
                        className="inline-flex min-h-10 items-center text-[13px] text-foreground-muted transition-colors duration-150 hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] text-foreground-faint">
            <BrandMark className="size-3.5 text-accent/70" />
            <span>
              © {year} {dict.brand}
            </span>
            <span className="text-foreground/20">·</span>
            <span>{dict.footer.rights}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground-faint">
            <Link href={`/${locale}/privacy`} className="hover:text-foreground">
              {dict.footer.privacy}
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-foreground">
              {dict.footer.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
