"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkspaceNameForm({
  initialName,
  locale,
}: {
  initialName: string;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/account/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setPending(false);
    if (!response.ok) {
      setMessage(isFa ? "ذخیره ناموفق بود." : "Could not save.");
      return;
    }
    setMessage(isFa ? "ذخیره شد." : "Saved.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 px-5 py-5">
      <label className="block text-xs text-muted-foreground">
        {isFa ? "نام ورک‌اسپیس" : "Workspace name"}
        <Input
          className="mt-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
      </label>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="submit" size="sm" disabled={pending || !name.trim()}>
        {pending ? "…" : isFa ? "ذخیره" : "Save"}
      </Button>
    </form>
  );
}
