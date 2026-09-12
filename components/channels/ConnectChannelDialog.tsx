"use client";

import { useState } from "react";
import { Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelIcon } from "@/components/channels/ChannelCard";
import type { ChannelType } from "@/types/publishing";
import { CHANNEL_META } from "@/types/publishing";
import { cn } from "@/lib/utils";

const OPTIONS: ChannelType[] = [
  "instagram",
  "telegram",
  "website",
  "whatsapp",
];

export function ConnectChannelDialog({
  locale,
  open,
  onOpenChange,
  onSelect,
}: {
  locale: "fa" | "en";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: ChannelType) => void;
}) {
  const isFa = locale === "fa";
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        aria-label={isFa ? "بستن" : "Close"}
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-channel-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2
              id="connect-channel-title"
              className="font-display text-xl tracking-tight text-ink"
            >
              {isFa ? "اتصال کانال" : "Connect a channel"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {isFa
                ? "مقصد انتشار محتوا را انتخاب کن."
                : "Choose where your content can go."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <ul className="divide-y divide-border p-2">
          {OPTIONS.map((type) => {
            const meta = CHANNEL_META[type];
            const soon = type === "whatsapp";
            const auto = type === "website";
            return (
              <li key={type}>
                <button
                  type="button"
                  disabled={soon}
                  onClick={() => {
                    if (soon) return;
                    onSelect(type);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-3.5 text-start transition-colors",
                    soon
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-[#f6f6f4]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/80",
                      soon ? "bg-[#f4f4f2] text-muted-foreground" : "bg-ink text-white",
                    )}
                  >
                    {soon ? (
                      <Lock className="size-3.5" aria-hidden />
                    ) : (
                      <ChannelIcon type={type} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {isFa ? meta.labelFa : meta.labelEn}
                      </span>
                      {soon ? (
                        <span className="rounded-full bg-[#f4f4f2] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {isFa ? "به‌زودی" : "Coming soon"}
                        </span>
                      ) : null}
                      {auto ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                          {isFa ? "خودکار" : "Auto"}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">
                      {type === "website"
                        ? isFa
                          ? "وبسایت فروشگاه‌ت به‌صورت خودکار متصل است."
                          : "Your storefront is connected automatically."
                        : type === "instagram"
                          ? isFa
                            ? "اکانت اینستاگرام واردشده را وصل کن."
                            : "Use your imported Instagram account."
                          : type === "telegram"
                            ? isFa
                              ? "کانال یا چت تلگرام را برای انتشار وصل کن."
                              : "Connect a Telegram channel or chat to publish."
                            : isFa
                              ? meta.descriptionFa
                              : meta.descriptionEn}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function ConnectChannelButton({
  locale,
  onOpen,
}: {
  locale: "fa" | "en";
  onOpen: () => void;
}) {
  const isFa = locale === "fa";
  return (
    <Button type="button" size="sm" onClick={onOpen}>
      <Plus className="size-3.5" aria-hidden />
      {isFa ? "اتصال کانال" : "Connect channel"}
    </Button>
  );
}

export function useConnectDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
