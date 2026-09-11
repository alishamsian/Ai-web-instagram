"use client";

import type { WebsiteConfig } from "@/types/website";
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

export function SiteHeader({ config }: { config: WebsiteConfig }) {
  const c = config.brand.colors;
  const isFa = config.settings.language === "fa";
  const isStore = config.template === "store";
  const { basePath, onHomeNavigate } = useSiteNav();
  const homeHref = basePath || "#top";

  const goHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onHomeNavigate) return;
    event.preventDefault();
    onHomeNavigate();
  };

  return (
    <header
      className={`vitrin-header ${isStore ? "vitrin-header--store" : ""}`}
      style={{
        background: isStore ? `${c.background}eb` : `${c.background}f2`,
        color: c.foreground,
        borderBottomColor: `${c.foreground}12`,
      }}
    >
      <div className="vitrin-wrap vitrin-header__inner">
        <a href={homeHref} className="vitrin-logo" onClick={goHome}>
          {config.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.brand.logo} alt="" className="vitrin-logo__mark" />
          ) : null}
          <span className={headingFont(config)}>{config.brand.name}</span>
        </a>
        <nav className="vitrin-nav" aria-label="Site">
          {config.content.products?.items.length ? (
            <a href={isStore ? `${basePath || ""}#products` : "#products"} onClick={goHome}>
              {isFa ? "فروشگاه" : "Shop"}
            </a>
          ) : null}
          {config.content.services?.items.length ? (
            <a href="#services">{isFa ? "خدمات" : "Services"}</a>
          ) : null}
          {config.content.gallery?.imageIds.length ? (
            <a href="#gallery">
              {isFa
                ? config.template === "store"
                  ? "لوک‌بوک"
                  : "گالری"
                : config.template === "store"
                  ? "Lookbook"
                  : "Gallery"}
            </a>
          ) : null}
          {config.content.about ? (
            <a href="#about">{isFa ? "درباره" : "About"}</a>
          ) : null}
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
  return (
    <div
      id="top"
      className={cn("vitrin-site", className)}
      data-template={config.template}
      data-scale={config.brand.typography.scale}
      style={
        {
          ["--vs-bg" as string]: c.background,
          ["--vs-fg" as string]: c.foreground,
          ["--vs-primary" as string]: c.primary,
          ["--vs-accent" as string]: c.accent,
          ["--vs-muted" as string]: c.muted,
          ["--vs-secondary" as string]: c.secondary,
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
