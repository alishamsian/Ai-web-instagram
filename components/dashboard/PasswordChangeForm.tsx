"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordChangeForm({
  locale,
}: {
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    if (!response.ok) {
      setError(
        payload.message ||
          (isFa ? "تغییر رمز ناموفق بود." : "Could not update password."),
      );
      return;
    }
    setPassword("");
    setMessage(isFa ? "رمز عبور به‌روز شد." : "Password updated.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 px-5 py-5">
      <label className="block text-xs text-muted-foreground">
        {isFa ? "رمز عبور جدید" : "New password"}
        <Input
          type="password"
          className="mt-1.5"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" size="sm" disabled={pending || password.length < 8}>
        {pending
          ? isFa
            ? "در حال ذخیره…"
            : "Saving…"
          : isFa
            ? "تغییر رمز"
            : "Update password"}
      </Button>
    </form>
  );
}
