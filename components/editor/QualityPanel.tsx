"use client";

import type { Locale } from "@/lib/config/env";
import type { WebsiteQualityScore } from "@/lib/editor/quality";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const CATEGORY_LABELS: Record<
  keyof WebsiteQualityScore["categories"],
  { fa: string; en: string }
> = {
  design: { fa: "طراحی", en: "Design" },
  content: { fa: "محتوا", en: "Content" },
  commerce: { fa: "فروش", en: "Commerce" },
  mobile: { fa: "موبایل", en: "Mobile" },
  accessibility: { fa: "دسترسی‌پذیری", en: "Accessibility" },
  seo: { fa: "سئو", en: "SEO" },
  performance: { fa: "عملکرد", en: "Performance" },
};

export function QualityPanel({
  open,
  locale,
  score,
  onClose,
}: {
  open: boolean;
  locale: Locale;
  score: WebsiteQualityScore;
  onClose: () => void;
}) {
  const isFa = locale === "fa";
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-s border-white/10 bg-[#0D0D0F] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-[#F7F7F8]">
              {isFa ? "کیفیت وب‌سایت" : "Website quality"}
            </p>
            <p className="text-[11px] text-[#77777F]">
              {isFa
                ? "امتیاز قابل‌توضیح — نه تصادفی"
                : "Explainable score — never random"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-[#77777F] hover:bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-white/[0.06] px-4 py-5">
          <p className="text-[40px] font-medium tracking-tight text-[#F7F7F8]">
            {score.total}
            <span className="ms-1 text-[16px] text-[#77777F]">/ 100</span>
          </p>
        </div>

        <ul className="space-y-2 border-b border-white/[0.06] px-4 py-4">
          {(Object.keys(score.categories) as (keyof typeof score.categories)[]).map(
            (key) => (
              <li key={key} className="flex items-center justify-between text-[12px]">
                <span className="text-[#B5B5BC]">
                  {CATEGORY_LABELS[key][locale]}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    score.categories[key] >= 85
                      ? "text-emerald-300"
                      : score.categories[key] >= 70
                        ? "text-amber-300"
                        : "text-red-300",
                  )}
                >
                  {score.categories[key]}
                </span>
              </li>
            ),
          )}
        </ul>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#77777F]">
            {isFa ? "دلایل کسر امتیاز" : "Deductions"}
          </p>
          {score.deductions.length === 0 ? (
            <p className="text-[12px] text-[#B5B5BC]">
              {isFa ? "کسر امتیازی ثبت نشده." : "No deductions."}
            </p>
          ) : (
            <ul className="space-y-2">
              {score.deductions.map((d, i) => (
                <li
                  key={`${d.category}-${i}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <p className="text-[12px] text-[#F7F7F8]">
                    {d.reason[locale]}
                  </p>
                  <p className="mt-1 text-[11px] text-[#77777F]">
                    −{d.points} · {CATEGORY_LABELS[d.category][locale]}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
