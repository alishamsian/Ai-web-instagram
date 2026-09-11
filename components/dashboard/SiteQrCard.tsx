"use client";

import { useMemo, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteQrCard({
  url,
  brandName,
  locale,
}: {
  url: string;
  brandName: string;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const [open, setOpen] = useState(false);
  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(url)}`,
    [url],
  );

  return (
    <div className="rounded-xl bg-[#f6f6f4] px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink">
            {isFa ? "QR استوری / چاپ" : "Story / print QR"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isFa ? "اسکن مستقیم به فروشگاه" : "Scan to your store"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
        >
          <QrCode className="size-3.5" aria-hidden />
          {open ? (isFa ? "بستن" : "Hide") : isFa ? "نمایش" : "Show"}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 flex flex-col items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={isFa ? `QR ${brandName}` : `${brandName} QR`}
            width={160}
            height={160}
            className="rounded-lg bg-white p-2"
          />
          <Button asChild size="sm" variant="ghost">
            <a
              href={qrSrc}
              download={`${brandName}-qr.png`}
              target="_blank"
              rel="noreferrer"
            >
              <Download className="size-3.5" aria-hidden />
              {isFa ? "دانلود" : "Download"}
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
