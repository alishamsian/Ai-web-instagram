"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Plus, Star } from "lucide-react";
import { SiteImage } from "@/components/website/SiteImage";
import { PRIMARY_SITE_COOKIE } from "@/lib/dashboard/primary-site";
import { cn } from "@/lib/utils";

export type SiteSwitcherOption = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: "draft" | "published" | "unpublished" | string;
  isPrimary: boolean;
};

function siteScopedHref(locale: string, pathname: string, siteId: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  const prefixes = [
    `/${locale}/dashboard/website`,
    `/${locale}/dashboard/domains`,
    `/${locale}/dashboard/content`,
  ];
  for (const prefix of prefixes) {
    if (path === prefix) {
      return `${prefix}?id=${siteId}`;
    }
  }
  return null;
}

function SiteAvatar({
  name,
  logo,
  size = "sm",
}: {
  name: string;
  logo: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "size-9" : "size-7";
  const initial = (name.trim()[0] || "V").toUpperCase();
  if (logo) {
    return (
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg bg-[#ecece9] ring-1 ring-border/70",
          dim,
        )}
      >
        <SiteImage src={logo} alt="" fill className="object-cover" sizes="36px" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-semibold text-white",
        dim,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function SiteSwitcher({
  locale,
  sites,
  selectedId,
}: {
  locale: "fa" | "en";
  sites: SiteSwitcherOption[];
  selectedId: string | null;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const urlSiteId = searchParams.get("id");
  const selected =
    sites.find((s) => s.id === (urlSiteId || selectedId)) ?? sites[0] ?? null;

  useEffect(() => {
    setOpen(false);
  }, [pathname, selectedId]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (sites.length === 0) {
    return (
      <a
        href={`/${locale}/create`}
        className="inline-flex h-9 max-w-[11rem] items-center gap-2 rounded-xl border border-dashed border-border bg-white px-2.5 text-xs font-medium text-muted-foreground transition hover:border-ink/25 hover:text-ink sm:max-w-[14rem]"
      >
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#f4f4f2]">
          <Plus className="size-3.5" aria-hidden />
        </span>
        <span className="truncate">{isFa ? "ساخت سایت" : "Create site"}</span>
      </a>
    );
  }

  function selectSite(site: SiteSwitcherOption) {
    document.cookie = `${PRIMARY_SITE_COOKIE}=${encodeURIComponent(site.id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setOpen(false);
    const scoped = siteScopedHref(locale, pathname, site.id);
    if (scoped) {
      router.push(scoped);
      return;
    }
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={isFa ? "انتخاب سایت" : "Choose site"}
        className={cn(
          "inline-flex h-9 max-w-[11rem] items-center gap-2 rounded-xl border border-border/80 bg-white px-1.5 pe-2 text-start shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:border-ink/20 sm:max-w-[16rem] sm:px-2",
          open && "border-ink/25 ring-2 ring-ink/5",
        )}
      >
        <SiteAvatar name={selected?.name ?? ""} logo={selected?.logo ?? null} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-ink">
            {selected?.name ?? (isFa ? "سایت" : "Site")}
          </span>
          <span className="hidden truncate font-mono text-[10px] text-muted-foreground sm:block" dir="ltr">
            /{selected?.slug}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute start-0 top-[calc(100%+0.4rem)] z-50 w-[min(100vw-1.5rem,18rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {isFa ? "سایت‌های تو" : "Your sites"}
            </p>
          </div>
          <ul className="max-h-64 overflow-y-auto p-1.5">
            {sites.map((site) => {
              const active = site.id === selected?.id;
              return (
                <li key={site.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectSite(site)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors",
                      active ? "bg-ink text-white" : "hover:bg-[#f6f6f4]",
                    )}
                  >
                    <SiteAvatar name={site.name} logo={site.logo} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {site.name}
                        </span>
                        {site.isPrimary ? (
                          <Star
                            className={cn(
                              "size-3 shrink-0",
                              active ? "fill-white text-white" : "fill-amber-500 text-amber-500",
                            )}
                            aria-hidden
                          />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block truncate font-mono text-[10px]",
                          active ? "text-white/65" : "text-muted-foreground",
                        )}
                        dir="ltr"
                      >
                        /s/{site.slug}
                        <span className="mx-1 opacity-40">·</span>
                        {site.status === "published"
                          ? isFa
                            ? "زنده"
                            : "Live"
                          : isFa
                            ? "پیش‌نویس"
                            : "Draft"}
                      </span>
                    </span>
                    {active ? (
                      <Check className="size-3.5 shrink-0 opacity-90" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-1.5">
            <a
              href={`/${locale}/create`}
              className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition hover:bg-[#f6f6f4] hover:text-ink"
            >
              <Plus className="size-3.5" aria-hidden />
              {isFa ? "سایت جدید" : "New site"}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
