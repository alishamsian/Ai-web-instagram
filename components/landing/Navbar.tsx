"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/landing/Brand";
import { MobileNav } from "@/components/landing/MobileNav";
import { NavLinks } from "@/components/landing/NavLinks";
import {
  MarketingThemeToggle,
  useMarketingTheme,
} from "@/components/landing/MarketingTheme";
import { Button } from "@/components/ui/button";
import { forwardArrow } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function Navbar({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const other = locale === "fa" ? "en" : "fa";
  const Arrow = forwardArrow(locale);
  const { theme, scoped } = useMarketingTheme();
  const light = theme === "light";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-200 md:h-[72px]",
        scrolled
          ? "border-b border-border shadow-elevated backdrop-blur-xl"
          : cn(
              "border-b border-transparent",
              light
                ? scoped
                  ? "bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-md"
                  : "bg-white/80 backdrop-blur-md"
                : "bg-transparent",
            ),
      )}
      style={
        scrolled
          ? {
              backgroundColor: scoped
                ? "var(--mkt-nav-scrolled)"
                : "rgba(255,255,255,0.92)",
              paddingTop: "env(safe-area-inset-top)",
            }
          : { paddingTop: "env(safe-area-inset-top)" }
      }
    >
      <div className="container-marketing flex h-full items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-10 lg:gap-14">
          <Brand href={`/${locale}`} name={dict.brand} />
          <nav className="hidden md:block" aria-label="Primary">
            <NavLinks dict={dict} locale={locale} />
          </nav>
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          {scoped ? (
            <MarketingThemeToggle
              labels={{
                dark: dict.theme.dark,
                light: dict.theme.light,
              }}
            />
          ) : null}
          <Link
            href={`/${other}`}
            hrefLang={other}
            className="rounded-[10px] px-2.5 py-2 text-xs font-medium text-foreground-muted transition-colors duration-150 hover:text-foreground"
          >
            {other === "fa" ? "فا" : "EN"}
          </Link>
          <Button variant={light ? "ghost" : "ghost-dark"} size="sm" asChild>
            <Link href={`/${locale}/login`}>{dict.nav.login}</Link>
          </Button>
          <Button variant="contrast" size="lg" asChild>
            <Link href={`/${locale}#start`}>
              {dict.nav.cta}
              <Arrow size={16} data-arrow aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {scoped ? (
            <MarketingThemeToggle
              labels={{
                dark: dict.theme.dark,
                light: dict.theme.light,
              }}
            />
          ) : null}
          <MobileNav open={open} onOpenChange={setOpen} dict={dict} locale={locale} />
        </div>
      </div>
    </header>
  );
}
