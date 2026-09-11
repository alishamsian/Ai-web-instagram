"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X } from "@/components/icons";
import { getNavLinks } from "@/components/landing/NavLinks";
import { useMarketingTheme } from "@/components/landing/MarketingTheme";
import { Button } from "@/components/ui/button";
import { forwardArrow } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

const HEADER_OFFSET = "calc(4rem + env(safe-area-inset-top, 0px))";

export function MobileNav({
  open,
  onOpenChange,
  dict,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dict: Dictionary;
  locale: Locale;
}) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const links = getNavLinks(dict, locale).filter(
    (link) => !link.href.includes("#examples"),
  );
  const Arrow = forwardArrow(locale);
  const { theme } = useMarketingTheme();
  const light = theme === "light";
  const other = locale === "fa" ? "en" : "fa";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[12px] text-foreground transition-[background-color,color] duration-150 hover:bg-muted md:hidden"
        aria-label={dict.nav.menu}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={locale === "fa" ? "بستن منو" : "Close menu"}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 bottom-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
              style={{ top: HEADER_OFFSET }}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={dict.nav.menu}
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 z-40 flex max-h-[min(70vh,calc(100dvh-4rem-env(safe-area-inset-top,0px)))] flex-col border-b border-border bg-background-elevated shadow-elevated md:hidden"
              style={{
                top: HEADER_OFFSET,
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <nav aria-label="Mobile" className="min-h-0 flex-1 overflow-y-auto px-4">
                <ul className="flex flex-col gap-0.5 py-2">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => onOpenChange(false)}
                        className="block rounded-[14px] px-3 py-3 text-[15px] font-medium text-foreground-secondary transition-colors duration-150 hover:bg-muted hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="space-y-2 border-t border-border px-4 pt-3">
                <Link
                  href={`/${other}`}
                  hrefLang={other}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between rounded-[14px] px-3 py-2.5 text-[14px] font-medium text-foreground-secondary hover:bg-muted hover:text-foreground"
                >
                  <span>{locale === "fa" ? "Language" : "زبان"}</span>
                  <span className="text-foreground">{other === "fa" ? "فارسی" : "English"}</span>
                </Link>
                <Button variant={light ? "ghost" : "ghost-dark"} size="xl" asChild className="w-full">
                  <Link href={`/${locale}/login`} onClick={() => onOpenChange(false)}>
                    {dict.nav.login}
                  </Link>
                </Button>
                <Button variant="contrast" size="xl" asChild className="w-full">
                  <Link href={`/${locale}#start`} onClick={() => onOpenChange(false)}>
                    {dict.nav.cta}
                    <Arrow size={16} data-arrow aria-hidden />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
