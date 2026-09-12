"use client";

import { useEffect, useState } from "react";
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
  const [estimatedNew, setEstimatedNew] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/websites/${websiteId}/sync/preview`,
        );
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          estimatedNew?: number;
        };
        if (!cancelled && typeof payload.estimatedNew === "number") {
          setEstimatedNew(payload.estimatedNew);
        }
      } catch {
        /* ignore preview failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [websiteId, enabled]);

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
    setMessage(
      isFa ? "جاب همگام‌سازی شروع شد." : "Sync job started.",
    );
    setEstimatedNew(0);
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

  const badge =
    enabled && estimatedNew != null && estimatedNew > 0
      ? isFa
        ? `${estimatedNew.toLocaleString("fa-IR")} جدید`
        : `${estimatedNew} new`
      : null;

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
        className="relative"
      >
        {label}
        {!enabled ? (
          <span className="ms-1 text-[10px] opacity-70">Pro</span>
        ) : null}
        {badge ? (
          <span className="ms-1.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
            {badge}
          </span>
        ) : null}
      </Button>
      {message ? (
        <p className="max-w-[14rem] text-[11px] leading-4 text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
