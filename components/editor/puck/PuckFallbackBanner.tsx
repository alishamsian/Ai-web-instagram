"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

export function PuckFallbackBanner({
  locale,
  websiteId,
}: {
  locale: "fa" | "en";
  websiteId: string;
}) {
  const isFa = locale === "fa";
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-950"
    >
      <p className="min-w-0 flex-1">
        {isFa
          ? "ویرایشگر جدید (Puck) — نسخه آزمایشی. ویرایشگر کلاسیک همچنان در دسترس است."
          : "New editor (Puck) — experimental. The classic editor remains available."}
      </p>
      <Link
        href={`/${locale}/editor/${websiteId}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <ArrowLeftRight className="size-3.5" aria-hidden />
        {isFa ? "بازگشت به کلاسیک" : "Back to classic"}
      </Link>
    </div>
  );
}
