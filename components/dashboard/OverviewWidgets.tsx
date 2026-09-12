"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  NextAction,
  OnboardingStep,
  SiteHealthItem,
  SmartSuggestion,
  ActivityItem,
} from "@/lib/dashboard/ops";
import { ONBOARDING_DISMISS_KEY } from "@/lib/dashboard/ops";
import { formatRelativeTime } from "@/lib/dashboard/format";
import { StatusBadge } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function NextActionsPanel({
  locale,
  actions,
}: {
  locale: "fa" | "en";
  actions: NextAction[];
}) {
  const isFa = locale === "fa";
  if (actions.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {isFa ? "الان" : "Now"}
        </p>
        <h2 className="mt-1 text-sm font-semibold text-ink">
          {isFa ? "گام‌های بعدی" : "Next up"}
        </h2>
      </div>
      <ul className="divide-y divide-border">
        {actions.map((action, index) => (
          <li key={action.id}>
            <Link
              href={`/${locale}/${action.href}`}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f6f6f4]"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  action.tone === "urgent"
                    ? "bg-amber-500/15 text-amber-900"
                    : action.tone === "insight"
                      ? "bg-ink/8 text-ink"
                      : "bg-[#f4f4f2] text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {isFa ? action.titleFa : action.titleEn}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  {isFa ? action.detailFa : action.detailEn}
                </span>
              </span>
              <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OnboardingRail({
  locale,
  workspaceId,
  steps,
}: {
  locale: "fa" | "en";
  workspaceId: string;
  steps: OnboardingStep[];
}) {
  const isFa = locale === "fa";
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`${ONBOARDING_DISMISS_KEY}:${workspaceId}`);
      setDismissed(v === "1" && complete);
      if (!complete) setDismissed(false);
    } catch {
      setDismissed(false);
    }
    void fetch("/api/onboarding/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: complete ? "complete" : "view",
      }),
    }).catch(() => null);
  }, [workspaceId, complete]);

  if (dismissed || (complete && dismissed)) return null;
  if (complete) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-5 py-4">
        <p className="text-sm font-medium text-emerald-900">
          {isFa ? "راه‌اندازی سه‌مرحله‌ای کامل شد." : "Three-step setup complete."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            try {
              localStorage.setItem(
                `${ONBOARDING_DISMISS_KEY}:${workspaceId}`,
                "1",
              );
            } catch {
              /* ignore */
            }
            void fetch("/api/onboarding/track", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ event: "dismiss" }),
            }).catch(() => null);
            setDismissed(true);
          }}
        >
          {isFa ? "پنهان کن" : "Dismiss"}
        </Button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {isFa ? "شروع" : "Start"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-ink">
            {isFa ? "۳ گام تا ویترین زنده" : "3 steps to a live storefront"}
          </h2>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {done}/3
        </span>
      </div>
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-ink transition-[width] duration-500"
          style={{ width: `${(done / 3) * 100}%` }}
        />
      </div>
      <ol className="grid gap-0 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "border-border p-4 sm:border-e sm:last:border-e-0",
              index > 0 && "border-t sm:border-t-0",
            )}
          >
            <Link
              href={`/${locale}/${step.href}`}
              className="block rounded-xl transition-colors hover:bg-[#fafafa]"
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold",
                  step.done
                    ? "bg-emerald-500 text-white"
                    : "bg-[#f4f4f2] text-muted-foreground ring-1 ring-border",
                )}
              >
                {step.done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">
                {isFa ? step.labelFa : step.labelEn}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {isFa ? step.hintFa : step.hintEn}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SiteHealthCard({
  locale,
  items,
  brandName,
}: {
  locale: "fa" | "en";
  items: SiteHealthItem[];
  brandName: string;
}) {
  const isFa = locale === "fa";
  const score = items.filter((i) => i.ok).length;
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {isFa ? "سلامت" : "Health"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-ink">{brandName}</h2>
        </div>
        <StatusBadge tone={score === items.length ? "success" : "warning"}>
          {score}/{items.length}
        </StatusBadge>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-[#f6f6f4]"
            >
              <span className="text-ink">
                {isFa ? item.labelFa : item.labelEn}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  item.ok ? "text-emerald-700" : "text-amber-800",
                )}
              >
                {item.ok
                  ? isFa
                    ? "آماده"
                    : "Ready"
                  : isFa
                    ? "نیاز به کار"
                    : "Needs work"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SmartSuggestionCard({
  locale,
  suggestion,
}: {
  locale: "fa" | "en";
  suggestion: SmartSuggestion;
}) {
  const isFa = locale === "fa";
  if (!suggestion) return null;
  return (
    <section className="rounded-2xl border border-border bg-[linear-gradient(165deg,#fff_0%,#fafafa_100%)] p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {isFa ? suggestion.titleFa : suggestion.titleEn}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-ink">
            {isFa ? suggestion.bodyFa : suggestion.bodyEn}
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href={`/${locale}/${suggestion.href}`}>
              {isFa ? suggestion.ctaFa : suggestion.ctaEn}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function ActivityFeed({
  locale,
  items,
  title,
  empty,
}: {
  locale: "fa" | "en";
  items: ActivityItem[];
  title?: string;
  empty?: string;
}) {
  const isFa = locale === "fa";
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">
          {title ?? (isFa ? "فعالیت‌ها" : "Activity")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isFa
            ? "ورود، انتشار، سفارش و بازنشر — یکجا"
            : "Imports, publishes, orders, and distribution"}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          {empty ?? (isFa ? "هنوز فعالیتی نیست." : "No activity yet.")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/${locale}/${item.href}`}
                className="flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[#f6f6f4]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-ink">
                      {item.title}
                    </p>
                    <StatusBadge
                      tone={
                        item.tone === "accent"
                          ? "accent"
                          : item.tone === "danger"
                            ? "danger"
                            : item.tone === "warning"
                              ? "warning"
                              : item.tone === "success"
                                ? "success"
                                : "neutral"
                      }
                    >
                      {formatRelativeTime(item.at, locale)}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
