"use client";

import Image from "next/image";
import { ChevronDown, Clapperboard, Grid3X3, Menu, PlusSquare, UserSquare2 } from "lucide-react";
import { DEMO_POSTS, DEMO_PROFILE } from "@/lib/demo/store";
import { cn, formatNumber } from "@/lib/utils";
import type { Locale } from "@/lib/config/env";
import type { InstagramPost, InstagramProfile } from "@/types/instagram";

function compactCount(value: number) {
  if (value >= 1_000_000) {
    const n = value / 1_000_000;
    return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}M`;
  }
  if (value >= 10_000) {
    const n = value / 1_000;
    return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}K`;
  }
  return formatNumber(value, "en");
}

function IgIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex size-6 items-center justify-center text-[#0f0f0f]", className)}>
      {children}
    </span>
  );
}

/** Realistic Instagram profile screen for marketing previews */
export function InstagramPreview({
  locale,
  profile = DEMO_PROFILE,
  posts = DEMO_POSTS,
  className,
  compact = false,
  username = "nooran.studio",
}: {
  locale: Locale;
  profile?: InstagramProfile;
  posts?: InstagramPost[];
  className?: string;
  compact?: boolean;
  /** Display username in the IG chrome (can differ from demo import username) */
  username?: string;
}) {
  const grid = posts.slice(0, compact ? 9 : 12);
  const highlights = posts.slice(0, 4);
  const copy =
    locale === "fa"
      ? {
          posts: "پست",
          followers: "فالوور",
          following: "فالوینگ",
          follow: "فالو",
          message: "پیام",
          contact: "ایمیل",
          category: profile.businessCategory ?? "برند پوشاک",
        }
      : {
          posts: "posts",
          followers: "followers",
          following: "following",
          follow: "Follow",
          message: "Message",
          contact: "Email",
          category: profile.businessCategory ?? "Clothing (Brand)",
        };

  return (
    <div
      className={cn(
        "select-none bg-white text-start text-[#0f0f0f] [font-family:var(--font-geist),system-ui,sans-serif]",
        className,
      )}
      dir="ltr"
    >
      {/* Top app bar */}
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <div className="flex min-w-0 items-center gap-1">
          <p className="truncate text-[15px] font-semibold tracking-tight">{username}</p>
          <ChevronDown className="size-3.5 shrink-0 opacity-80" aria-hidden />
        </div>
        <div className="flex items-center gap-3.5">
          <IgIcon>
            <PlusSquare className="size-[22px]" strokeWidth={1.6} />
          </IgIcon>
          <IgIcon>
            <Menu className="size-[22px]" strokeWidth={1.6} />
          </IgIcon>
        </div>
      </div>

      {/* Avatar + stats */}
      <div className="flex items-center gap-5 px-3 pt-1">
        <div className="relative shrink-0">
          <div
            className="rounded-full p-[2px]"
            style={{
              background:
                "conic-gradient(from 210deg, #f58529, #dd2a7b, #8134af, #515bd4, #f58529)",
            }}
          >
            <div className="rounded-full bg-white p-[2px]">
              <Image
                src={profile.profilePicUrlHD ?? profile.profilePicUrl ?? ""}
                alt=""
                width={78}
                height={78}
                className="size-[74px] rounded-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3 text-center">
          <div>
            <p className="text-sm font-semibold tabular-nums leading-none">
              {compactCount(profile.postsCount ?? 0)}
            </p>
            <p className="mt-1 text-[11px] leading-none text-[#0f0f0f]">{copy.posts}</p>
          </div>
          <div>
            <p className="text-sm font-semibold tabular-nums leading-none">
              {compactCount(profile.followersCount ?? 0)}
            </p>
            <p className="mt-1 text-[11px] leading-none text-[#0f0f0f]">{copy.followers}</p>
          </div>
          <div>
            <p className="text-sm font-semibold tabular-nums leading-none">
              {compactCount(profile.followsCount ?? 0)}
            </p>
            <p className="mt-1 text-[11px] leading-none text-[#0f0f0f]">{copy.following}</p>
          </div>
        </div>
      </div>

      {/* Name / category / bio */}
      <div className="mt-3 space-y-0.5 px-3">
        <p className="text-[13px] font-semibold leading-tight">{profile.fullName}</p>
        <p className="text-[12px] leading-tight text-[#737373]">{copy.category}</p>
        <p className="whitespace-pre-line text-[13px] leading-[1.35]">{profile.biography}</p>
      </div>

      {/* Action buttons */}
      <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 px-3">
        <button
          type="button"
          tabIndex={-1}
          className="h-8 rounded-lg bg-[#0095f6] text-[13px] font-semibold text-white"
        >
          {copy.follow}
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="h-8 rounded-lg bg-[#efefef] text-[13px] font-semibold"
        >
          {copy.message}
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="h-8 rounded-lg bg-[#efefef] text-[13px] font-semibold"
        >
          {copy.contact}
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efefef]"
          aria-hidden
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* Highlights */}
      {!compact ? (
        <div className="mt-4 flex gap-3 overflow-hidden px-3">
          {highlights.map((post, index) => (
            <div key={post.id} className="w-16 shrink-0 text-center">
              <div className="mx-auto size-[60px] rounded-full border border-[#dbdbdb] p-[2px]">
                <Image
                  src={post.displayUrl ?? ""}
                  alt=""
                  width={56}
                  height={56}
                  className="size-full rounded-full object-cover"
                />
              </div>
              <p className="mt-1 truncate text-[11px] text-[#0f0f0f]">
                {["New", "Look", "Studio", "Sale"][index]}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mt-3 flex border-t border-[#dbdbdb]">
        <div className="flex flex-1 items-center justify-center border-b border-[#0f0f0f] py-2.5">
          <Grid3X3 className="size-[22px]" strokeWidth={1.7} />
        </div>
        <div className="flex flex-1 items-center justify-center py-2.5 opacity-40">
          <Clapperboard className="size-[22px]" strokeWidth={1.7} aria-hidden />
        </div>
        <div className="flex flex-1 items-center justify-center py-2.5 opacity-40">
          <UserSquare2 className="size-[22px]" strokeWidth={1.7} />
        </div>
      </div>

      {/* Feed grid */}
      <div className="grid grid-cols-3 gap-px bg-[#dbdbdb]">
        {grid.map((post) => (
          <Image
            key={post.id}
            src={post.displayUrl ?? ""}
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
