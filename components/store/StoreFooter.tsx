"use client";

import type { WebsiteConfig } from "@/types/website";
import { useSiteNav } from "@/components/website/SiteNavContext";

export function StoreFooter({
  config,
  hasCategories = false,
  mode = "home",
}: {
  config: WebsiteConfig;
  hasCategories?: boolean;
  mode?: "home" | "pdp";
}) {
  const isFa = config.settings.language === "fa";
  const year = new Date().getFullYear();
  const { basePath, onHomeNavigate } = useSiteNav();
  const root = basePath.replace(/\/$/, "");

  const sectionHref = (hash: string) =>
    mode === "pdp" ? `${root || ""}${hash}` : hash;

  const goSection = (event: React.MouseEvent, hash: string) => {
    if (mode !== "pdp" || !onHomeNavigate) return;
    event.preventDefault();
    onHomeNavigate();
    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  return (
    <footer className="store-footer">
      <div className="store-wrap store-footer__grid">
        <div>
          <p className="store-logo">{config.brand.name}</p>
          <p className="store-muted">
            {config.brand.tagline ||
              (isFa
                ? "ویترین آنلاین ساخته‌شده از اینستاگرام."
                : "An online storefront built from Instagram.")}
          </p>
        </div>
        <div>
          <p className="store-footer__label">{isFa ? "فروشگاه" : "Shop"}</p>
          <a href={sectionHref("#shop")} onClick={(e) => goSection(e, "#shop")}>
            {isFa ? "محصولات" : "Products"}
          </a>
          {hasCategories ? (
            <a
              href={sectionHref("#categories")}
              onClick={(e) => goSection(e, "#categories")}
            >
              {isFa ? "دسته‌ها" : "Categories"}
            </a>
          ) : null}
          <a
            href={sectionHref("#lookbook")}
            onClick={(e) => goSection(e, "#lookbook")}
          >
            {isFa ? "لوک‌بوک" : "Lookbook"}
          </a>
        </div>
        <div>
          <p className="store-footer__label">{isFa ? "راهنما" : "Help"}</p>
          <a href={sectionHref("#faq")} onClick={(e) => goSection(e, "#faq")}>
            FAQ
          </a>
          <a
            href={sectionHref("#contact")}
            onClick={(e) => goSection(e, "#contact")}
          >
            {isFa ? "تماس" : "Contact"}
          </a>
          <a href={sectionHref("#story")} onClick={(e) => goSection(e, "#story")}>
            {isFa ? "درباره" : "About"}
          </a>
        </div>
      </div>
      <div className="store-wrap store-footer__bottom">
        <span>
          © {year} {config.brand.name}
        </span>
        {config.settings.showBranding ? (
          <span className="store-muted">
            {isFa ? "ساخته‌شده با ویترین" : "Made with Vitrin"}
          </span>
        ) : null}
      </div>
    </footer>
  );
}
