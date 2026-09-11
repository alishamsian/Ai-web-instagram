"use client";

import Image from "next/image";
import { Grid3X3, Clapperboard, UserSquare2, BadgeCheck } from "lucide-react";
import { InstagramGlyph } from "@/components/icons";
import { INSTAGRAM_DEMO_BRAND } from "@/lib/demo/instagram-demo";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";

export function InstagramPreview({
  className,
  dimmed = false,
  locale = "en",
}: {
  className?: string;
  dimmed?: boolean;
  locale?: Locale;
}) {
  const brand = INSTAGRAM_DEMO_BRAND;
  const fa = locale === "fa";

  return (
    <div className={cn("relative", className)}>
      <p className="mb-3 text-center text-[10px] font-medium tracking-[0.22em] text-foreground-muted uppercase">
        {fa ? "اینستاگرام شما" : "Your Instagram"}
      </p>

      <div
        className={cn(
          "overflow-hidden rounded-[1.35rem] bg-[#0a0a0a] text-white shadow-[0_28px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition-[opacity,filter,transform] duration-700",
          dimmed && "scale-[0.96] opacity-45 blur-[1px]",
        )}
      >
        {/* Phone chrome top */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
          <p className="text-[13px] font-semibold tracking-tight">{brand.username}</p>
          <InstagramGlyph size={16} className="text-white/80" aria-hidden />
        </div>

        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-5">
            <div
              className="shrink-0 rounded-full p-[2px]"
              style={{
                background:
                  "conic-gradient(from 210deg, #f58529, #dd2a7b, #8134af, #515bd4, #f58529)",
              }}
            >
              <div className="rounded-full bg-[#0a0a0a] p-[2px]">
                <Image
                  src={brand.avatar}
                  alt=""
                  width={86}
                  height={86}
                  className="size-[78px] rounded-full object-cover"
                />
              </div>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-3 text-center">
              {[
                [brand.posts, fa ? "پست" : "posts"],
                [brand.followers, fa ? "دنبال‌کننده" : "followers"],
                [brand.following, fa ? "دنبال‌شونده" : "following"],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="text-[14px] font-semibold tabular-nums leading-none">{value}</p>
                  <p className="mt-1.5 text-[11px] text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3.5 space-y-0.5 text-start">
            <div className="flex items-center gap-1">
              <p className="text-[13px] font-semibold">{brand.name}</p>
              <BadgeCheck size={14} className="text-[#3897f0]" aria-hidden />
            </div>
            <p className="text-[12px] text-white/50">{brand.category}</p>
            <p className="pt-0.5 text-[13px] leading-5 text-white/90">{brand.bio}</p>
            <p className="text-[13px] font-medium text-[#e0f1ff]">{brand.link}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <span className="flex h-8 items-center justify-center rounded-lg bg-[#0095f6] text-[12px] font-semibold text-white">
              Follow
            </span>
            <span className="flex h-8 items-center justify-center rounded-lg bg-white/10 text-[12px] font-semibold text-white">
              Message
            </span>
          </div>
        </div>

        <div className="flex items-center justify-around border-y border-white/[0.08] py-2.5 text-white/45">
          <Grid3X3 size={18} className="text-white" aria-hidden />
          <Clapperboard size={18} aria-hidden />
          <UserSquare2 size={18} aria-hidden />
        </div>

        <div className="grid grid-cols-3 gap-px bg-white/10">
          {brand.images.slice(0, 12).map((src) => (
            <div key={src} className="relative aspect-square bg-[#141414]">
              <Image src={src} alt="" fill className="object-cover" sizes="140px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
