"use client";

import Link from "next/link";
import { Check, Link2, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BioLinkButton } from "@/components/dashboard/BioLinkButton";
import { ShareLinkButton } from "@/components/dashboard/ShareLinkButton";
import { SiteQrCard } from "@/components/dashboard/SiteQrCard";
import { publishedSiteUrl } from "@/lib/config/runtime";

export function PostPublishDialog({
  open,
  onClose,
  locale,
  brandName,
  slug,
  websiteId,
}: {
  open: boolean;
  onClose: () => void;
  locale: "fa" | "en";
  brandName: string;
  slug: string;
  websiteId: string;
}) {
  const isFa = locale === "fa";
  const liveUrl = publishedSiteUrl(slug);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        aria-label={isFa ? "بستن" : "Close"}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isFa ? "سایت منتشر شد" : "Site published"}
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
              <Check className="size-3.5" aria-hidden />
              {isFa ? "منتشر شد" : "Published"}
            </p>
            <h2 className="mt-1 font-display text-xl tracking-tight text-ink">
              {isFa ? "الان لینک بیو را بگذار" : "Add the bio link now"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {isFa
                ? "یک چک‌لیست کوتاه تا اولین بازدید برسد."
                : "A short checklist so the first visits land."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
            aria-label={isFa ? "بستن" : "Close"}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <ol className="space-y-2 text-sm text-ink">
            <li className="flex gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[10px] font-medium">
                1
              </span>
              <span>
                {isFa
                  ? "لینک بیو را کپی کن و در اینستاگرام بگذار"
                  : "Copy the bio link into Instagram"}
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[10px] font-medium">
                2
              </span>
              <span>
                {isFa
                  ? "QR را برای استوری ذخیره کن"
                  : "Save the QR for a story"}
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ink/8 text-[10px] font-medium">
                3
              </span>
              <span>
                {isFa
                  ? "سفارش‌ها را از داشبورد دنبال کن"
                  : "Watch orders from the dashboard"}
              </span>
            </li>
          </ol>

          <div className="rounded-2xl bg-[#f6f6f4] p-3.5 ring-1 ring-border/70">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Link2 className="size-3.5" aria-hidden />
              {isFa ? "لینک بیو" : "Bio link"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <BioLinkButton
                url={liveUrl}
                brandName={brandName}
                locale={locale}
              />
              <ShareLinkButton url={liveUrl} locale={locale} />
            </div>
          </div>

          <div className="rounded-2xl border border-border p-3.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <QrCode className="size-3.5" aria-hidden />
              QR
            </p>
            <div className="mt-2">
              <SiteQrCard
                url={liveUrl}
                brandName={brandName}
                locale={locale}
                prominent
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border bg-[#fafafa] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/${locale}/dashboard/website?id=${websiteId}`}>
              {isFa ? "مدیریت سایت" : "Site hub"}
            </Link>
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            {isFa ? "باشه" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}
