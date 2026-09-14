"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { WebsiteConfig } from "@/types/website";
import {
  resolveBrandDesign,
  contentWidthCss,
  sectionSpacingCss,
  radiusChrome,
  shadowCss,
} from "@/lib/design-system/brand-design";
import { cn } from "@/lib/utils";
import { useSiteNav } from "@/components/website/SiteNavContext";

export function headingFont(config: WebsiteConfig) {
  if (config.brand.typography.heading === "serif") return "vitrin-heading-serif";
  if (config.brand.typography.heading === "display") return "vitrin-heading-display";
  return "vitrin-heading-sans";
}

export function siteMedia(config: WebsiteConfig, id?: string) {
  if (!id) return undefined;
  return config.media[id];
}

function siteNavLinks(config: WebsiteConfig, basePath: string, isStore: boolean, isFa: boolean) {
  const links: { href: string; label: string; home?: boolean }[] = [];
  if (config.content.products?.items.length) {
    links.push({
      href: isStore ? `${basePath || ""}#products` : "#products",
      label: isFa ? "فروشگاه" : "Shop",
      home: true,
    });
  }
  if (config.content.services?.items.length) {
    links.push({ href: "#services", label: isFa ? "خدمات" : "Services" });
  }
  if (config.content.gallery?.imageIds.length) {
    links.push({
      href: "#gallery",
      label: isFa
        ? config.template === "store"
          ? "لوک‌بوک"
          : "گالری"
        : config.template === "store"
          ? "Lookbook"
          : "Gallery",
    });
  }
  if (config.content.about) {
    links.push({ href: "#about", label: isFa ? "درباره" : "About" });
  }
  return links;
}

export function SiteHeader({ config }: { config: WebsiteConfig }) {
  const c = config.brand.colors;
  const isFa = config.settings.language === "fa";
  const isStore = config.template === "store";
  const { basePath, onHomeNavigate } = useSiteNav();
  const homeHref = basePath || "#top";
  const [menuOpen, setMenuOpen] = useState(false);
  const links = siteNavLinks(config, basePath || "", isStore, isFa);

  const goHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onHomeNavigate) return;
    event.preventDefault();
    onHomeNavigate();
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn("vitrin-header", isStore && "vitrin-header--store", menuOpen && "vitrin-header--menu-open")}
      style={{
        background: isStore ? `${c.background}eb` : `${c.background}f2`,
        color: c.foreground,
        borderBottomColor: `${c.foreground}12`,
      }}
    >
      <div className="vitrin-wrap vitrin-header__inner">
        <button
          type="button"
          className="vitrin-nav-toggle"
          aria-label={menuOpen ? (isFa ? "بستن منو" : "Close menu") : isFa ? "منو" : "Menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <a href={homeHref} className="vitrin-logo" onClick={goHome}>
          {config.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.brand.logo} alt="" className="vitrin-logo__mark" />
          ) : null}
          <span className={headingFont(config)}>{config.brand.name}</span>
        </a>
        <nav className="vitrin-nav" aria-label="Site">
          {links.map((link) => (
            <a key={link.href} href={link.href} onClick={link.home ? goHome : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={isStore ? `${basePath || ""}#products` : "#contact"}
          className={`vitrin-cta vitrin-cta--sm ${isStore ? "vitrin-cta--store" : ""}`}
          style={
            isStore
              ? {
                  background: "transparent",
                  color: c.foreground,
                  boxShadow: `inset 0 0 0 1px ${c.foreground}28`,
                }
              : { background: c.foreground, color: c.background }
          }
          onClick={isStore ? goHome : undefined}
        >
          {isStore
            ? isFa
              ? "خرید"
              : "Shop"
            : config.content.hero.cta}
        </a>
      </div>

      {menuOpen ? (
        <nav
          className="vitrin-nav-mobile"
          aria-label={isFa ? "منوی موبایل" : "Mobile menu"}
          style={{ borderTopColor: `${c.foreground}12` }}
        >
          <div className="vitrin-wrap vitrin-nav-mobile__inner">
            {links.map((link) => (
              <a
                key={`m-${link.href}`}
                href={link.href}
                onClick={(event) => {
                  if (link.home) goHome(event);
                  closeMenu();
                }}
              >
                {link.label}
              </a>
            ))}
            <a
              href={isStore ? `${basePath || ""}#products` : "#contact"}
              className={`vitrin-cta vitrin-cta--sm ${isStore ? "vitrin-cta--store" : ""}`}
              style={
                isStore
                  ? {
                      background: "transparent",
                      color: c.foreground,
                      boxShadow: `inset 0 0 0 1px ${c.foreground}28`,
                    }
                  : { background: c.foreground, color: c.background }
              }
              onClick={(event) => {
                if (isStore) goHome(event);
                closeMenu();
              }}
            >
              {isStore ? (isFa ? "خرید" : "Shop") : config.content.hero.cta}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function WebsiteShell({
  config,
  children,
  className,
}: {
  config: WebsiteConfig;
  children: React.ReactNode;
  className?: string;
}) {
  const c = config.brand.colors;
  const design = resolveBrandDesign(config);
  const radius = radiusChrome(design.radius);
  const shadows = shadowCss(design.shadow);
  return (
    <div
      id="top"
      className={cn("vitrin-site", className)}
      data-template={config.template}
      data-scale={config.brand.typography.scale}
      data-radius={design.radius}
      data-shadow={design.shadow}
      style={
        {
          ["--vs-bg" as string]: c.background,
          ["--vs-fg" as string]: c.foreground,
          ["--vs-primary" as string]: c.primary,
          ["--vs-accent" as string]: c.accent,
          ["--vs-muted" as string]: c.muted,
          ["--vs-secondary" as string]: c.secondary,
          ["--vs-wrap" as string]: contentWidthCss(design.contentWidth),
          ["--vs-section-pad" as string]: sectionSpacingCss(design.sectionSpacing),
          ["--vs-radius-md" as string]: radius.radiusMd,
          ["--vs-radius-lg" as string]: radius.radiusLg,
          ["--vs-btn-radius" as string]: radius.buttonRadius,
          ["--vs-shadow-card" as string]: shadows.card,
          background: c.background,
          color: c.foreground,
        } as React.CSSProperties
      }
      dir={config.settings.direction}
      lang={config.settings.language}
    >
      <SiteHeader config={config} />
      <main>{children}</main>
    </div>
  );
}
