"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  locale,
  priceId,
  label,
}: {
  locale: "fa" | "en";
  priceId: string;
  label?: string;
}) {
  const isFa = locale === "fa";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceId, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok || !data.url) {
        if (data.error === "BILLING_NOT_CONFIGURED") {
          setError(
            isFa
              ? "صورتحساب هنوز پیکربندی نشده است."
              : "Billing is not configured yet.",
          );
        } else {
          setError(
            data.message ||
              (isFa ? "شروع پرداخت ناموفق بود." : "Could not start checkout."),
          );
        }
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(isFa ? "خطای شبکه." : "Network error.");
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        disabled={pending || !priceId}
        onClick={onClick}
      >
        {pending
          ? isFa
            ? "…"
            : "…"
          : label || (isFa ? "ارتقا" : "Upgrade")}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
