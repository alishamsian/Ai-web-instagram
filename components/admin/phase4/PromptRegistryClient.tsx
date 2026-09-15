"use client";

import { useState, useTransition } from "react";
import { upsertAdminPromptRegistry } from "@/lib/admin/phase4-actions";
import { AdminCard } from "@/components/admin/primitives";
import type { Locale } from "@/lib/config/env";

export function PromptRegistryClient({ locale }: { locale: Locale }) {
  const isFa = locale === "fa";
  const [feature, setFeature] = useState("");
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertAdminPromptRegistry({
        feature,
        version,
        status,
        notes: notes || null,
      });
      setMessage(
        result.ok
          ? isFa
            ? "ثبت شد"
            : "Saved"
          : result.message,
      );
      if (result.ok) {
        setFeature("");
        setVersion("");
        setStatus("draft");
        setNotes("");
      }
    });
  }

  return (
    <AdminCard>
      <h3 className="text-sm font-semibold text-[var(--admin-fg)]">
        {isFa ? "ثبت / به‌روزرسانی متادیتا" : "Register / update metadata"}
      </h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        {isFa
          ? "فقط متادیتا — بدون متن خام پرامپت"
          : "Metadata only — no raw prompt bodies"}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-[var(--admin-muted)]">Feature</span>
            <input
              required
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="text-[var(--admin-muted)]">Version</span>
            <input
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="retired">retired</option>
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[var(--admin-fg)] px-3 py-1.5 text-xs font-medium text-[var(--admin-bg)] disabled:opacity-50"
          >
            {pending ? (isFa ? "در حال ذخیره…" : "Saving…") : isFa ? "ذخیره" : "Save"}
          </button>
          {message ? (
            <p className="text-xs text-[var(--admin-muted)]">{message}</p>
          ) : null}
        </div>
      </form>
    </AdminCard>
  );
}
