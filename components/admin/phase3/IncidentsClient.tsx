"use client";

import { useState, useTransition } from "react";
import { createAdminIncident } from "@/lib/admin/phase3-actions";
import type { Locale } from "@/lib/config/env";

export function IncidentsClient({ locale }: { locale: Locale }) {
  const isFa = locale === "fa";
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">(
    "warning",
  );
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createAdminIncident({
        title,
        severity,
        summary: summary || undefined,
      });
      if (result.ok) {
        setTitle("");
        setSummary("");
        setMessage(isFa ? "حادثه ثبت شد" : "Incident created");
      } else {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
      <p className="text-sm font-medium text-[var(--admin-fg)]">
        {isFa ? "باز کردن حادثه" : "Open incident"}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isFa ? "عنوان" : "Title"}
          className="h-9 rounded-lg border border-[var(--admin-border)] bg-transparent px-3 text-sm text-[var(--admin-fg)] outline-none focus:border-[var(--admin-fg)]/30"
        />
        <select
          value={severity}
          onChange={(e) =>
            setSeverity(e.target.value as "info" | "warning" | "critical")
          }
          className="h-9 rounded-lg border border-[var(--admin-border)] bg-transparent px-3 text-sm text-[var(--admin-fg)]"
        >
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
      </div>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={isFa ? "خلاصه (اختیاری)" : "Summary (optional)"}
        rows={2}
        className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-transparent px-3 py-2 text-sm text-[var(--admin-fg)] outline-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !title.trim()}
          onClick={submit}
          className="rounded-lg bg-[var(--admin-fg)] px-3 py-1.5 text-xs font-medium text-[var(--admin-bg)] disabled:opacity-50"
        >
          {pending ? (isFa ? "…" : "…") : isFa ? "ایجاد" : "Create"}
        </button>
        {message ? (
          <p className="text-xs text-[var(--admin-muted)]">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
