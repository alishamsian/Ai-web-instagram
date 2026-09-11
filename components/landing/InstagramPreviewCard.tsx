import Image from "next/image";
import { HERO_DEMO } from "@/lib/demo/hero";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/config/env";

export function InstagramPreviewCard({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const category = HERO_DEMO.category[locale];
  const bio = HERO_DEMO.bio[locale];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] border border-white/10 bg-white text-[#0f0f0f] shadow-[0_24px_60px_rgba(0,0,0,0.45)]",
        className,
      )}
      dir="ltr"
    >
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
        <p className="text-[13px] font-semibold tracking-tight">{HERO_DEMO.username}</p>
        <span className="text-[11px] text-[#8e8e8e]">Instagram</span>
      </div>

      <div className="flex items-center gap-4 px-3.5">
        <div
          className="rounded-full p-[2px]"
          style={{
            background:
              "conic-gradient(from 210deg, #f58529, #dd2a7b, #8134af, #515bd4, #f58529)",
          }}
        >
          <div className="rounded-full bg-white p-[2px]">
            <Image
              src={HERO_DEMO.avatar}
              alt=""
              width={64}
              height={64}
              className="size-14 rounded-full object-cover"
            />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 text-center">
          {[
            [HERO_DEMO.posts, locale === "fa" ? "پست" : "posts"],
            [HERO_DEMO.followers, locale === "fa" ? "فالوور" : "followers"],
            [HERO_DEMO.following, locale === "fa" ? "فالوینگ" : "following"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-[13px] font-semibold tabular-nums leading-none">{value}</p>
              <p className="mt-1 text-[10px] text-[#737373]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-0.5 px-3.5 text-start">
        <p className="text-[13px] font-semibold leading-tight">{HERO_DEMO.name}</p>
        <p className="text-[11px] text-[#737373]">{category}</p>
        <p className="whitespace-pre-line text-[12px] leading-[1.35] text-[#0f0f0f]">{bio}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 px-3.5">
        <span className="flex h-8 items-center justify-center rounded-lg bg-[#0095f6] text-[12px] font-semibold text-white">
          {locale === "fa" ? "فالو" : "Follow"}
        </span>
        <span className="flex h-8 items-center justify-center rounded-lg bg-[#efefef] text-[12px] font-semibold">
          {locale === "fa" ? "پیام" : "Message"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px border-t border-[#dbdbdb] bg-[#dbdbdb]">
        {HERO_DEMO.images.slice(0, 6).map((src) => (
          <Image
            key={src}
            src={src}
            alt=""
            width={160}
            height={160}
            className="aspect-square w-full bg-white object-cover"
          />
        ))}
      </div>
    </div>
  );
}
