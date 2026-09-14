"use client";

import { useId, useMemo, useState } from "react";
import { IconInstagram, forwardArrow } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import { InstagramUrlError, normalizeInstagramUrl } from "@/lib/instagram/url";

/**
 * URL-only entry. Post count is chosen on the create step after submit.
 */
export function InstagramInput({
  dict,
  locale,
  className,
  defaultValue = "",
  ctaLabel,
}: {
  dict: Dictionary;
  locale: Locale;
  className?: string;
  defaultValue?: string;
  ctaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const errorId = useId();
  const Arrow = forwardArrow(locale);

  const error = useMemo(() => {
    if (!touched || !value.trim()) return null;
    try {
      normalizeInstagramUrl(value);
      return null;
    } catch (err) {
      if (err instanceof InstagramUrlError) return dict.errors.invalidUrl;
      return dict.errors.invalidUrl;
    }
  }, [touched, value, dict.errors.invalidUrl]);

  return (
    <form
      action={`/${locale}/create`}
      method="get"
      className={cn("w-full", className)}
      onSubmit={(event) => {
        setTouched(true);
        try {
          const parsed = normalizeInstagramUrl(value);
          const field = event.currentTarget.elements.namedItem(
            "url",
          ) as HTMLInputElement | null;
          if (field) field.value = parsed.canonical;
          setValue(parsed.canonical);
          setLoading(true);
        } catch {
          event.preventDefault();
        }
      }}
    >
      <label
        htmlFor={inputId}
        className="mb-2 block text-start text-[13px] font-medium leading-5 text-[#c8c8ce]"
      >
        {dict.hero.inputLabel}
      </label>

      <div
        className={cn(
          "flex overflow-hidden rounded-xl border bg-[#0a0a0a]",
          "transition-[border-color,box-shadow] duration-150",
          error
            ? "border-[#ff6b57] shadow-[0_0_0_3px_rgba(255,107,87,0.18)]"
            : focused
              ? "border-[#ff6b57]/70 shadow-[0_0_0_3px_rgba(255,107,87,0.14)]"
              : "border-[#2a2a2e] hover:border-[#3a3a40]",
        )}
      >
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2.5 px-3.5 sm:h-[3.25rem] sm:px-4">
          <IconInstagram
            size={18}
            className="shrink-0 text-[#a0a0a8]"
            aria-hidden
          />
          <input
            id={inputId}
            name="url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setTouched(true);
            }}
            placeholder={dict.hero.placeholder}
            autoComplete="url"
            inputMode="url"
            enterKeyHint="go"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? errorId : undefined}
            dir="ltr"
            className={cn(
              "h-full w-full min-w-0 bg-transparent text-start outline-none",
              "text-[15px] font-medium leading-none tracking-[-0.01em] text-[#f5f5f7]",
              "placeholder:font-normal placeholder:text-[#7a7a84]",
              "caret-[#ff6b57]",
            )}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className={cn(
            "inline-flex h-12 shrink-0 items-center justify-center gap-2 border-s border-[#2a2a2e] px-4 sm:h-[3.25rem] sm:px-5",
            "bg-[#ff6b57] text-[14px] font-semibold text-[#080808]",
            "transition-[filter,opacity] duration-150 hover:brightness-110",
            "disabled:pointer-events-none disabled:opacity-70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b57]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
          )}
        >
          {loading ? (
            <>
              <span
                className="size-3.5 animate-spin rounded-full border-2 border-[#080808]/25 border-t-[#080808]"
                aria-hidden
              />
              <span className="hidden sm:inline">{dict.hero.building}</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{ctaLabel ?? dict.hero.cta}</span>
              <Arrow size={15} data-arrow aria-hidden />
            </>
          )}
        </button>
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-start text-[13px] font-medium leading-5 text-[#ff6b57]"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
