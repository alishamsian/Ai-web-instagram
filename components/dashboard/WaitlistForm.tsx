"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm({
  locale,
  source = "billing",
}: {
  locale: "fa" | "en";
  source?: string;
}) {
  const isFa = locale === "fa";
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, locale, source }),
    });
    setPending(false);
    if (!response.ok) {
      setError(isFa ? "ثبت‌نام در لیست انتظار ناموفق بود." : "Could not join waitlist.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-emerald-700">
        {isFa ? "ثبت شد — به‌زودی خبر می‌دهیم." : "You're on the list — we'll be in touch."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={isFa ? "ایمیل شما" : "Your email"}
        className="sm:min-w-[220px]"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending
          ? isFa
            ? "…"
            : "…"
          : isFa
            ? "عضویت در لیست انتظار"
            : "Join waitlist"}
      </Button>
      {error ? <p className="text-sm text-red-600 sm:basis-full">{error}</p> : null}
    </form>
  );
}
