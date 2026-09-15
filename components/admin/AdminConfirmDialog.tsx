"use client";

import type { ReactNode } from "react";

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="admin-confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-elevated)]">
        <h2
          id="admin-confirm-title"
          className="text-base font-semibold text-[var(--admin-fg)]"
        >
          {title}
        </h2>
        <div className="mt-2 text-sm text-[var(--admin-muted)]">{description}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-muted-bg)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              tone === "danger"
                ? "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                : "rounded-lg bg-[var(--admin-fg)] px-3 py-1.5 text-xs font-medium text-[var(--admin-bg)] disabled:opacity-50"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
