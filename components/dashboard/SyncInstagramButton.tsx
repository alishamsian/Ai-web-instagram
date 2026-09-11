"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SyncInstagramButton({
  websiteId,
  locale,
  enabled,
}: {
  websiteId: string;
  locale: "fa" | "en";
  enabled: boolean;
}) {
  const isFa = locale === "fa";
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onClick() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/websites/${websiteId}/sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
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
            : isFa
              ? "همگام‌سازی ناموفق بود."
              : "Sync failed."),
      );
      return;
    }
    setMessage(
      isFa ? "جاب همگام‌سازی شروع شد." : "Sync job started.",
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || !enabled}
        onClick={() => void onClick()}
      >
        {pending
          ? isFa
            ? "در حال همگام‌سازی…"
            : "Syncing…"
          : isFa
            ? "همگام‌سازی اینستاگرام"
            : "Sync Instagram"}
      </Button>
      {!enabled ? (
        <p className="text-xs text-muted-foreground">
          {isFa ? "فقط پلن حرفه‌ای" : "Pro only"}
        </p>
      ) : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
