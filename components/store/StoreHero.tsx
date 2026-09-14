"use client";

import type { WebsiteConfig } from "@/types/website";
import { resolveSectionVariant } from "@/lib/store/registry/variant-api";
import { HeroFan } from "@/components/store/variants/hero/HeroFan";
import { HeroOverlay } from "@/components/store/variants/hero/HeroOverlay";
import { HeroSplit } from "@/components/store/variants/hero/HeroSplit";
import { HeroMinimal } from "@/components/store/variants/hero/HeroMinimal";
import { HeroEditorial } from "@/components/store/variants/hero/HeroEditorial";
import { ArrowUpRight } from "lucide-react";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { cn } from "@/lib/utils";

/**
 * Compatibility entry — prefers dedicated variant components.
 * Runtime registry (`resolveSectionRenderer`) is the primary path.
 */
export function StoreHero({ config }: { config: WebsiteConfig }) {
  const raw =
    config.sections.find((s) => s.type === "hero")?.variant ||
    config.content.hero.style ||
    null;
  const id = resolveSectionVariant("hero", raw).id ?? "fan";

  switch (id) {
    case "overlay":
      return <HeroOverlay config={config} />;
    case "split":
      return <HeroSplit config={config} />;
    case "minimal":
      return <HeroMinimal config={config} />;
    case "editorial":
      return <HeroEditorial config={config} />;
    case "fan":
    default:
      return <HeroFan config={config} />;
  }
}

export function StoreCategories({
  config,
  categories,
}: {
  config: WebsiteConfig;
  categories: {
    id: string;
    title: string;
    description: string;
    imageId?: string;
    href: string;
  }[];
}) {
  const isFa = config.settings.language === "fa";
  if (!categories.length) return null;

  const layout =
    categories.length >= 4
      ? "editorial"
      : categories.length === 3
        ? "three"
        : "two";

  return (
    <section className="store-section" id="categories">
      <div className="store-wrap">
        <div className="store-section__head store-section__head--row">
          <div>
            <p className="store-kicker">
              {isFa ? "مجموعه‌ها" : "Collections"}
            </p>
            <h2 className="store-heading">
              {isFa ? "خرید بر اساس دسته" : "Shop by category"}
            </h2>
          </div>
        </div>

        <div
          className={cn(
            "store-cats",
            layout === "editorial" && "store-cats--editorial",
            layout === "three" && "store-cats--3",
            layout === "two" && "store-cats--2",
          )}
        >
          {categories.map((cat, index) => {
            const image = siteMedia(config, cat.imageId);
            return (
              <a
                key={cat.id}
                href={cat.href}
                className={cn(
                  "store-cat",
                  layout === "editorial" && index === 0 && "store-cat--lead",
                )}
              >
                <div className="store-cat__media">
                  {image ? (
                    <SiteMedia
                      media={image}
                      mode="cover"
                      width={1000}
                      height={1250}
                      className="store-cat__img"
                      sizes="(max-width: 768px) 70vw, 33vw"
                    />
                  ) : (
                    <div className="store-cat__ph" />
                  )}
                  <span className="store-cat__veil" />
                </div>
                <div className="store-cat__copy">
                  <h3>{cat.title}</h3>
                  <span className="store-cat__meta">
                    {cat.description}
                    <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
