"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DomainConnectForm({
  websiteId,
  locale,
  enabled,
  initialHost,
  compact = false,
}: {
  websiteId: string;
  locale: "fa" | "en";
  enabled: boolean;
  initialHost?: string | null;
  compact?: boolean;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [host, setHost] = useState(initialHost ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!enabled) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/websites/${websiteId}/domain`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host }),
    });
    setPending(false);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      host?: string;
    };
    if (!response.ok) {
      setMessage(
        payload.message ||
          (payload.error === "PRO_REQUIRED"
            ? isFa
              ? "فقط پلن حرفه‌ای"
              : "Pro only"
            : payload.error === "HOST_TAKEN"
              ? isFa
                ? "این دامنه قبلاً ثبت شده."
                : "Host already taken."
              : isFa
                ? "اتصال ناموفق بود."
                : "Could not connect."),
      );
      return;
    }
    setMessage(isFa ? "دامنه ثبت شد." : "Domain saved.");
    if (payload.host) setHost(payload.host);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-2.5", compact && "space-y-2")}>
      <label className="block text-xs text-muted-foreground">
        {compact ? (isFa ? "دامنه اختصاصی" : "Custom domain") : "example.com"}
        <Input
          className={cn("mt-1.5", compact && "h-9")}
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="www.yourbrand.com"
          disabled={!enabled || pending}
          required
        />
      </label>
      {message ? (
        <p className="text-xs text-muted-foreground">{message}</p>
      ) : null}
      <Button
        type="submit"
        size={compact ? "sm" : "default"}
        className="w-full"
        disabled={!enabled || pending || !host.trim()}
      >
        {pending ? "…" : isFa ? "اتصال دامنه" : "Connect domain"}
      </Button>
    </form>
  );
}
