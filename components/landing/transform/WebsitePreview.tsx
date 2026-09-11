"use client";

import Image from "next/image";
import { INSTAGRAM_DEMO_BRAND } from "@/lib/demo/instagram-demo";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

export function WebsitePreview({
  className,
  dominant = false,
  locale = "en",
}: {
  className?: string;
  dominant?: boolean;
  locale?: Locale;
}) {
  const brand = INSTAGRAM_DEMO_BRAND;
  const c = brand.colors;
  const fa = locale === "fa";

  return (
    <div className={cn("relative", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-[10px] font-medium tracking-[0.22em] text-foreground-muted uppercase">
          {fa ? "وب‌سایت شما" : "Your Website"}
        </p>
        {dominant ? (
          <p className="text-[10px] text-foreground-faint">
            {fa ? "ساخته‌شده از اینستاگرامت" : "Generated from your Instagram"}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-[1.15rem] shadow-[0_30px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-[transform,opacity] duration-700",
          dominant ? "scale-100 opacity-100" : "scale-[0.98] opacity-95",
        )}
        style={{ background: c.ivory, color: c.foreground }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-black/8 bg-[#1a1a1c] px-3 py-2.5">
          <span className="size-2 rounded-full bg-[#FF5F57]" aria-hidden />
          <span className="size-2 rounded-full bg-[#FEBC2E]" aria-hidden />
          <span className="size-2 rounded-full bg-[#28C840]" aria-hidden />
          <div className="ms-2 min-w-0 flex-1 truncate rounded-md bg-black/35 px-2.5 py-1 text-center font-mono text-[10px] text-white/65">
            https://{brand.siteUrl}
          </div>
        </div>

        {/* Site nav */}
        <header
          className="flex items-center justify-between px-5 py-4 md:px-7"
          style={{ borderBottom: `1px solid ${c.softNeutral}` }}
        >
          <p className="text-[11px] font-semibold tracking-[0.18em]">{brand.name}</p>
          <nav className="hidden items-center gap-5 text-[11px] text-black/45 md:flex">
            <span>Shop</span>
            <span>About</span>
            <span>Journal</span>
          </nav>
          <span
            className="rounded-md px-3 py-1.5 text-[10px] font-semibold text-white"
            style={{ background: c.charcoal }}
          >
            {brand.cta}
          </span>
        </header>

        {/* Hero */}
        <section className="relative min-h-[240px] overflow-hidden md:min-h-[300px]">
          <Image
            src={brand.images[0]}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="text-[10px] tracking-[0.2em] text-white/65">{brand.handle}</p>
            <h3 className="mt-2 max-w-[14ch] font-display text-[1.85rem] leading-[1.05] text-white md:text-[2.35rem]">
              {brand.headline}
            </h3>
            <p className="mt-3 max-w-md text-[12px] leading-5 text-white/75 md:text-[13px]">
              {brand.subheadline}
            </p>
          </div>
        </section>

        {/* Products */}
        <section className="px-5 py-8 md:px-7">
          <div className="flex items-end justify-between gap-3">
            <h4 className="font-display text-lg tracking-tight md:text-xl">Featured</h4>
            <span className="text-[11px] text-black/40">From Instagram</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2.5 md:gap-3">
            {brand.products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-black/5"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={product.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </div>
                <div className="space-y-0.5 p-2.5">
                  <p className="line-clamp-1 text-[11px] font-medium">{product.name}</p>
                  <p className="text-[11px] tabular-nums text-black/50">{product.price}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* About + gallery */}
        <section
          className="grid gap-5 px-5 py-2 md:grid-cols-2 md:gap-6 md:px-7 md:py-4"
        >
          <div>
            <p
              className="text-[10px] tracking-[0.18em] uppercase"
              style={{ color: c.mutedAccent }}
            >
              About
            </p>
            <p className="mt-2 text-[13px] leading-6 text-black/65">{brand.about}</p>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
            <Image
              src={brand.images[4]}
              alt=""
              fill
              className="object-cover"
              sizes="360px"
            />
          </div>
        </section>

        {/* Gallery strip */}
        <section className="px-5 py-7 md:px-7">
          <div className="grid grid-cols-4 gap-2">
            {brand.images.slice(5, 9).map((src) => (
              <div key={src} className="relative aspect-square overflow-hidden rounded-lg">
                <Image src={src} alt="" fill className="object-cover" sizes="120px" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-8 md:px-7">
          <div
            className="flex flex-col items-start justify-between gap-4 rounded-2xl px-5 py-6 md:flex-row md:items-center"
            style={{ background: c.charcoal, color: c.ivory }}
          >
            <div>
              <p className="text-[11px] tracking-[0.16em] uppercase opacity-60">
                {brand.category}
              </p>
              <p className="mt-1 font-display text-xl">{brand.headline}</p>
            </div>
            <span
              className="rounded-md px-4 py-2.5 text-[12px] font-semibold"
              style={{ background: c.ivory, color: c.charcoal }}
            >
              {brand.cta}
            </span>
          </div>
        </section>

        <footer
          className="flex items-center justify-between px-5 py-6 text-[11px] md:px-7"
          style={{ borderTop: `1px solid ${c.softNeutral}`, color: "rgba(0,0,0,0.4)" }}
        >
          <span className="font-semibold tracking-[0.12em] text-black/70">{brand.name}</span>
          <span>{brand.siteUrl}</span>
        </footer>
      </div>
    </div>
  );
}
