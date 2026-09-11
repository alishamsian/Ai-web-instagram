"use client";

import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import type { WebsiteConfig } from "@/types/website";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { useStoreCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

function navLinks(isFa: boolean, hasCategories: boolean) {
  const all = isFa
    ? [
        { href: "#shop", label: "فروشگاه", id: "shop" },
        { href: "#categories", label: "دسته‌ها", id: "categories" },
        { href: "#story", label: "داستان", id: "story" },
        { href: "#lookbook", label: "لوک‌بوک", id: "lookbook" },
      ]
    : [
        { href: "#shop", label: "Shop", id: "shop" },
        { href: "#categories", label: "Categories", id: "categories" },
        { href: "#story", label: "Story", id: "story" },
        { href: "#lookbook", label: "Lookbook", id: "lookbook" },
      ];
  return hasCategories ? all : all.filter((l) => l.id !== "categories");
}

export function StoreAnnouncement({ config }: { config: WebsiteConfig }) {
  const isFa = config.settings.language === "fa";
  return (
    <div className="store-announce">
      <p>
        {isFa
          ? "ارسال سراسری · پاسخ سریع در دایرکت · سفارش از صفحه محصول"
          : "Nationwide shipping · Fast reply on Instagram · Order from product pages"}
      </p>
    </div>
  );
}

export function StoreHeader({
  config,
  hasCategories = false,
  mode = "home",
}: {
  config: WebsiteConfig;
  hasCategories?: boolean;
  mode?: "home" | "pdp";
}) {
  const isFa = config.settings.language === "fa";
  const { basePath, onHomeNavigate } = useSiteNav();
  const cart = useStoreCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = navLinks(isFa, hasCategories);
  const homeHref = basePath || "#top";
  const root = basePath.replace(/\/$/, "");

  const sectionHref = (hash: string) => {
    if (mode === "pdp") return `${root || ""}${hash}`;
    return hash;
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const goHome = (event: React.MouseEvent) => {
    if (!onHomeNavigate) return;
    event.preventDefault();
    onHomeNavigate();
  };

  const goSection = (event: React.MouseEvent, hash: string) => {
    if (mode !== "pdp" || !onHomeNavigate) return;
    event.preventDefault();
    onHomeNavigate();
    // Best-effort scroll after canvas home swap
    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  return (
    <>
      <header className={cn("store-header", scrolled && "store-header--solid")}>
        <div className="store-wrap store-header__inner">
          <button
            type="button"
            className="store-icon-btn store-header__menu"
            aria-label={isFa ? "منو" : "Menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} />
          </button>

          <nav className="store-header__nav" aria-label="Primary">
            {links.map((link) => (
              <a
                key={link.href}
                href={sectionHref(link.href)}
                onClick={(event) => goSection(event, link.href)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a href={homeHref} className="store-logo" onClick={goHome}>
            {config.brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.brand.logo} alt="" className="store-logo__mark" />
            ) : null}
            <span>{config.brand.name}</span>
          </a>

          <div className="store-header__actions">
            <button
              type="button"
              className="store-icon-btn store-header__cart"
              aria-label={isFa ? "سبد" : "Cart"}
              onClick={() => cart.setOpen(true)}
            >
              <ShoppingBag size={17} />
              {cart.count > 0 ? (
                <span className="store-header__badge">{cart.count}</span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn("store-drawer", menuOpen && "store-drawer--open")}
        role="dialog"
        aria-modal="true"
        aria-label={isFa ? "منوی موبایل" : "Mobile menu"}
      >
        <div className="store-drawer__panel">
          <div className="store-drawer__top">
            <span className="store-logo">{config.brand.name}</span>
            <button
              type="button"
              className="store-icon-btn"
              aria-label={isFa ? "بستن" : "Close"}
              onClick={() => setMenuOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <nav className="store-drawer__nav">
            {links.map((link) => (
              <a
                key={link.href}
                href={sectionHref(link.href)}
                onClick={(event) => {
                  goSection(event, link.href);
                  setMenuOpen(false);
                }}
              >
                {link.label}
              </a>
            ))}
            <a
              href={sectionHref("#contact")}
              onClick={(event) => {
                goSection(event, "#contact");
                setMenuOpen(false);
              }}
            >
              {isFa ? "تماس" : "Contact"}
            </a>
          </nav>
        </div>
        <button
          type="button"
          className="store-drawer__scrim"
          aria-label={isFa ? "بستن" : "Close"}
          onClick={() => setMenuOpen(false)}
        />
      </div>
    </>
  );
}
