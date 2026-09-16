"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ManageBillingButton({
  locale,
  label,
}: {
  locale: "fa" | "en";
  label?: string;
}) {
  const isFa = locale === "fa";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale }),
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
              (isFa
                ? "باز کردن پورتال ناموفق بود."
                : "Could not open billing portal."),
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
        variant="outline"
        disabled={pending}
        onClick={onClick}
      >
        {pending
          ? "…"
          : label || (isFa ? "مدیریت صورتحساب" : "Manage billing")}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
