"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import type { WebsiteConfig } from "@/types/website";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { useStoreCart } from "@/lib/store/cart";
import { StoreIconButton } from "@/components/store/primitives";
import { cn } from "@/lib/utils";

function navLinks(isFa: boolean, hasCategories: boolean) {
  const all = isFa
    ? [
        { href: "#shop", label: "فروشگاه", id: "shop" },
        { href: "#categories", label: "مجموعه‌ها", id: "categories" },
        { href: "#featured", label: "تازه‌ها", id: "featured" },
        { href: "#bestsellers", label: "پرفروش", id: "bestsellers" },
        { href: "#story", label: "داستان", id: "story" },
      ]
    : [
        { href: "#shop", label: "Shop", id: "shop" },
        { href: "#categories", label: "Collections", id: "categories" },
        { href: "#featured", label: "New Arrivals", id: "featured" },
        { href: "#bestsellers", label: "Bestsellers", id: "bestsellers" },
        { href: "#story", label: "Story", id: "story" },
      ];
  return hasCategories ? all : all.filter((l) => l.id !== "categories");
}

export function StoreAnnouncement({ config }: { config: WebsiteConfig }) {
  const isFa = config.settings.language === "fa";
  const [dismissed, setDismissed] = useState(false);
  const trust = config.content.trust?.items?.filter(Boolean) ?? [];
  const message =
    trust[0] ||
    (isFa
      ? "ارسال سراسری · پاسخ سریع در دایرکت · سفارش از صفحه محصول"
      : "Free shipping on orders · Fast reply on Instagram · Order from product pages");

  if (dismissed) return null;

  return (
    <div
      className="store-announce"
      role="region"
      aria-label={isFa ? "اعلان" : "Announcement"}
    >
      <p className="store-announce__text">{message}</p>
      <button
        type="button"
        className="store-announce__close"
        aria-label={isFa ? "بستن" : "Dismiss"}
        onClick={() => setDismissed(true)}
      >
        <X size={14} strokeWidth={1.75} />
      </button>
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
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const links = navLinks(isFa, hasCategories);
  const homeHref = basePath || "#top";
  const root = basePath.replace(/\/$/, "");

  const sectionHref = (hash: string) =>
    mode === "pdp" ? `${root || ""}${hash}` : hash;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      if (y > 120 && y > lastY.current + 4) setHidden(true);
      else if (y < lastY.current - 4 || y < 80) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
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
    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  return (
    <>
      <header
        className={cn(
          "store-header",
          scrolled && "store-header--solid",
          mode === "home" && !scrolled && "store-header--overlay",
          hidden && !menuOpen && "store-header--hidden",
        )}
      >
        <div className="store-wrap store-header__inner">
          <a href={homeHref} className="store-logo" onClick={goHome}>
            {config.brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.brand.logo} alt="" className="store-logo__mark" />
            ) : null}
            <span>{config.brand.name}</span>
          </a>

          <nav className="store-header__nav" aria-label="Primary">
            {links.map((link) => (
              <a
                key={link.id}
                href={sectionHref(link.href)}
                onClick={(event) => goSection(event, link.href)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="store-header__actions">
            <a
              href={sectionHref("#shop")}
              className="store-icon-btn"
              aria-label={isFa ? "جستجو" : "Search"}
              onClick={(event) => goSection(event, "#shop")}
            >
              <Search size={18} strokeWidth={1.6} />
            </a>
            <StoreIconButton
              className="store-header__account"
              aria-label={isFa ? "حساب" : "Account"}
              disabled
              title={isFa ? "به‌زودی" : "Coming soon"}
            >
              <User size={18} strokeWidth={1.6} />
            </StoreIconButton>
            <StoreIconButton
              aria-label={isFa ? "علاقه‌مندی‌ها" : "Wishlist"}
              disabled
              title={isFa ? "به‌زودی" : "Coming soon"}
            >
              <Heart size={18} strokeWidth={1.6} />
            </StoreIconButton>
            <StoreIconButton
              className="store-header__cart"
              aria-label={isFa ? "سبد" : "Cart"}
              onClick={() => cart.setOpen(true)}
            >
              <ShoppingBag size={18} strokeWidth={1.6} />
              {cart.count > 0 ? (
                <span className="store-header__badge">{cart.count}</span>
              ) : null}
            </StoreIconButton>
            <StoreIconButton
              className="store-header__menu"
              aria-label={isFa ? "منو" : "Menu"}
              aria-expanded={menuOpen}
              aria-controls={titleId}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} strokeWidth={1.6} />
            </StoreIconButton>
          </div>
        </div>
      </header>

      <div
        className={cn("store-drawer", menuOpen && "store-drawer--open")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="store-drawer__scrim"
          aria-label={isFa ? "بستن" : "Close"}
          onClick={() => setMenuOpen(false)}
        />
        <div className="store-drawer__panel">
          <div className="store-drawer__top">
            <span className="store-logo" id={titleId}>
              {config.brand.name}
            </span>
            <StoreIconButton
              ref={closeRef}
              aria-label={isFa ? "بستن" : "Close"}
              onClick={() => setMenuOpen(false)}
            >
              <X size={20} strokeWidth={1.6} />
            </StoreIconButton>
          </div>
          <nav className="store-drawer__nav">
            {links.map((link) => (
              <a
                key={link.id}
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
              href={sectionHref("#lookbook")}
              onClick={(event) => {
                goSection(event, "#lookbook");
                setMenuOpen(false);
              }}
            >
              {isFa ? "گالری" : "Gallery"}
            </a>
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
          <div className="store-drawer__foot">
            <button
              type="button"
              className="store-btn store-btn--solid store-btn--block"
              onClick={() => {
                cart.setOpen(true);
                setMenuOpen(false);
              }}
            >
              {isFa ? "مشاهده سبد" : "View bag"}
              {cart.count > 0 ? ` (${cart.count})` : ""}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
