"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SyncInstagramButton({
  websiteId,
  locale,
  enabled,
  sourceUrl,
  compact = false,
  className,
}: {
  websiteId: string;
  locale: "fa" | "en";
  enabled: boolean;
  /** Real Instagram profile URL — preferred over slug fallback on the server. */
  sourceUrl?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onClick() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/websites/${websiteId}/sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        locale,
        ...(sourceUrl ? { url: sourceUrl } : {}),
      }),
    });
    setPending(false);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!response.ok) {
      setMessage(
        payload.message ||
          (payload.error === "PRO_REQUIRED"
            ? isFa
              ? "همگام‌سازی برای پلن حرفه‌ای است."
              : "Sync requires Pro."
            : payload.error === "NO_SOURCE"
              ? isFa
                ? "منبع اینستاگرام پیدا نشد."
                : "No Instagram source found."
              : isFa
                ? "همگام‌سازی ناموفق بود."
                : "Sync failed."),
      );
      return;
    }
    setMessage(isFa ? "جاب همگام‌سازی شروع شد." : "Sync job started.");
    router.refresh();
  }

  const label = pending
    ? "…"
    : compact
      ? isFa
        ? "همگام‌سازی"
        : "Sync"
      : isFa
        ? "همگام‌سازی اینستاگرام"
        : "Sync Instagram";

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || !enabled}
        title={
          !enabled
            ? isFa
              ? "فقط پلن حرفه‌ای"
              : "Pro only"
            : undefined
        }
        onClick={() => void onClick()}
      >
        {label}
        {!enabled ? (
          <span className="ms-1 text-[10px] opacity-70">Pro</span>
        ) : null}
      </Button>
      {message && !compact ? (
        <p className="max-w-[14rem] text-[11px] leading-4 text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
