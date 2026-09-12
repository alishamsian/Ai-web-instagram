"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetupStep } from "@/lib/dashboard/format";

export function SetupChecklist({
  steps,
  locale,
}: {
  steps: SetupStep[];
  locale: "fa" | "en";
}) {
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length && steps.length > 0;
  const isFa = locale === "fa";
  const next = steps.find((s) => !s.done);
  const [open, setOpen] = useState(!complete);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 border-b border-border px-5 py-4 text-start"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {isFa ? "راه‌اندازی" : "Setup"}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-ink">
            {complete
              ? isFa
                ? "راه‌اندازی کامل شد"
                : "Setup complete"
              : isFa
                ? "چک‌لیست ویترین"
                : "Vitrin checklist"}
          </h2>
          {!open ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {complete
                ? isFa
                  ? "همه گام‌ها انجام شده."
                  : "All steps done."
                : isFa
                  ? `گام بعدی: ${next?.labelFa ?? ""}`
                  : `Next: ${next?.labelEn ?? ""}`}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {done}/{steps.length}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <>
          <div className="border-b border-border px-5 py-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500"
                style={{
                  width: `${(done / Math.max(steps.length, 1)) * 100}%`,
                }}
              />
            </div>
            {next ? (
              <p className="mt-2.5 text-xs text-muted-foreground">
                {isFa ? "گام بعدی: " : "Next: "}
                <span className="font-medium text-ink">
                  {isFa ? next.labelFa : next.labelEn}
                </span>
              </p>
            ) : (
              <p className="mt-2.5 text-xs font-medium text-emerald-700">
                {isFa ? "همه چیز آماده است." : "You're all set."}
              </p>
            )}
          </div>
          <ul className="divide-y divide-border">
            {steps.map((step, index) => (
              <li key={step.id}>
                <Link
                  href={`/${locale}/${step.href}`}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5 text-sm transition-colors",
                    step.done
                      ? "bg-emerald-500/[0.04] text-emerald-900"
                      : "text-ink hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      step.done
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    {step.done ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1",
                      step.done && "line-through opacity-70",
                    )}
                  >
                    {isFa ? step.labelFa : step.labelEn}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
