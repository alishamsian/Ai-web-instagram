"use client";

import dynamic from "next/dynamic";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

function DemoSkeleton({ variant }: { variant: "phone" | "wide" }) {
  if (variant === "phone") {
    return (
      <div className="border-y border-border-subtle bg-background" aria-hidden>
        <div className="container-marketing py-14 md:py-20">
          <div className="mx-auto h-7 max-w-[12rem] animate-pulse rounded-full bg-[var(--mkt-panel-hover)]" />
          <div className="mx-auto mt-3 h-4 max-w-[16rem] animate-pulse rounded-full bg-[var(--mkt-panel)]" />
          <div
            className="phone-frame mx-auto mt-8 animate-pulse rounded-[3rem] bg-[var(--mkt-panel)] ring-1 ring-border lg:hidden"
          />
          <div className="mx-auto mt-8 hidden h-[28rem] max-w-5xl animate-pulse rounded-xl bg-[var(--mkt-panel)] ring-1 ring-border lg:block" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-y border-border-subtle bg-background" aria-hidden>
      <div className="container-marketing py-14 md:py-20">
        <div className="mx-auto h-7 max-w-[12rem] animate-pulse rounded-full bg-[var(--mkt-panel-hover)]" />
        <div className="mx-auto mt-3 h-4 max-w-[16rem] animate-pulse rounded-full bg-[var(--mkt-panel)]" />
        <div className="phone-frame mx-auto mt-8 animate-pulse rounded-[3rem] bg-[var(--mkt-panel)] ring-1 ring-border lg:hidden" />
        <div className="mx-auto mt-8 hidden h-[32rem] max-w-5xl animate-pulse rounded-xl bg-[var(--mkt-panel)] ring-1 ring-border lg:block" />
      </div>
    </div>
  );
}

const WebsiteShowcase = dynamic(
  () =>
    import("@/components/landing/WebsiteShowcase").then((m) => m.WebsiteShowcase),
  {
    ssr: false,
    loading: () => <DemoSkeleton variant="phone" />,
  },
);

const DashboardShowcase = dynamic(
  () =>
    import("@/components/landing/DashboardShowcase").then(
      (m) => m.DashboardShowcase,
    ),
  {
    ssr: false,
    loading: () => <DemoSkeleton variant="wide" />,
  },
);

/** Client boundary for heavy demos — allows `dynamic(..., { ssr: false })`. */
export function LazyMarketingDemos({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <>
      <WebsiteShowcase dict={dict} locale={locale} />
      <DashboardShowcase dict={dict} locale={locale} />
    </>
  );
}
