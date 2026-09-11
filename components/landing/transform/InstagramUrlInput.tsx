"use client";

import { InstagramGlyph } from "@/components/icons";
import { forwardArrow } from "@/components/icons";
import { cn } from "@/lib/utils";

export function InstagramUrlInput({
  url,
  ctaLabel,
  loading = false,
  onSubmit,
  className,
  locale = "en",
}: {
  url: string;
  ctaLabel: string;
  loading?: boolean;
  onSubmit: () => void;
  className?: string;
  locale?: string;
}) {
  const Arrow = forwardArrow(locale);

  return (
    <div className={cn("w-full max-w-xl", className)}>
      <label htmlFor="ig-demo-url" className="sr-only">
        Instagram URL
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-[16px] border border-white/12 bg-white/[0.05] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl",
          "focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_rgba(255,107,87,0.18)]",
        )}
      >
        <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-[12px] px-3.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10">
            <InstagramGlyph size={18} aria-hidden />
          </span>
          <input
            id="ig-demo-url"
            readOnly
            value={url}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-foreground-muted md:text-[15px]"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="inline-flex h-12 min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-[12px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-70 md:px-5"
        >
          {loading ? (locale === "fa" ? "در حال ساخت…" : "Building…") : ctaLabel}
          {!loading ? <Arrow size={16} aria-hidden /> : null}
        </button>
      </div>
    </div>
  );
}
