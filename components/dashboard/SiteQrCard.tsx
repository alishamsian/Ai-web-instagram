"use client";

import { useMemo, useState } from "react";
import { Download, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteQrCard({
  url,
  brandName,
  locale,
  prominent = false,
}: {
  url: string;
  brandName: string;
  locale: "fa" | "en";
  /** Show QR expanded by default with stronger visual weight. */
  prominent?: boolean;
}) {
  const isFa = locale === "fa";
  const [open, setOpen] = useState(prominent);
  const qrSrc = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=16&data=${encodeURIComponent(url)}`,
    [url],
  );

  function printQr() {
    const title = isFa ? `QR ${brandName}` : `${brandName} QR`;
    const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;gap:16px;padding:24px;text-align:center}
  img{width:240px;height:240px;background:#fff;padding:12px;border-radius:12px}
  h1{font-size:18px;margin:0;font-weight:600}
  p{font-size:12px;color:#666;margin:0;word-break:break-all;direction:ltr}
  @media print{body{padding:0}}
</style></head><body>
  <h1>${brandName}</h1>
  <img src="${qrSrc}" alt="${title}" width="240" height="240" />
  <p>${url}</p>
  <script>window.onload=function(){setTimeout(function(){window.print()},200)}</script>
</body></html>`);
    win.document.close();
  }

  return (
    <div
      className={cn(
        "rounded-xl px-3.5 py-3",
        prominent
          ? "border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]"
          : "bg-[#f6f6f4]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink">
            {isFa ? "QR استوری / چاپ" : "Story / print QR"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {isFa ? "اسکن مستقیم به فروشگاه" : "Scan to your store"}
          </p>
        </div>
        {!prominent ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen((v) => !v)}
          >
            <QrCode className="size-3.5" aria-hidden />
            {open ? (isFa ? "بستن" : "Hide") : isFa ? "نمایش" : "Show"}
          </Button>
        ) : (
          <QrCode className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
      </div>
      {open ? (
        <div className="mt-3 flex flex-col items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={isFa ? `QR ${brandName}` : `${brandName} QR`}
            width={prominent ? 180 : 160}
            height={prominent ? 180 : 160}
            className="rounded-lg bg-white p-2 ring-1 ring-border/60"
          />
          <div className="flex flex-wrap items-center justify-center gap-1.5">
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
            <Button type="button" size="sm" variant="outline" onClick={printQr}>
              <Printer className="size-3.5" aria-hidden />
              {isFa ? "چاپ" : "Print"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
