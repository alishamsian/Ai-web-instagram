"use client";

import type { Locale } from "@/lib/config/env";
import type { HistoryEntry } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function HistoryPanel({
  open,
  locale,
  entries,
  index,
  onClose,
  onRestore,
}: {
  open: boolean;
  locale: Locale;
  entries: HistoryEntry[];
  index: number;
  onClose: () => void;
  onRestore: (index: number) => void;
}) {
  const isFa = locale === "fa";
  if (!open) return null;

  const visible = [...entries].reverse();

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col border-s border-[color:var(--ed-border)] bg-[color:var(--ed-bg-elevated)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--ed-border)] px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-[color:var(--ed-fg)]">
              {isFa ? "تاریخچه" : "History"}
            </p>
            <p className="text-[11px] text-[color:var(--ed-muted)]">
              {isFa
                ? "بازیابی وضعیت قبلی ویرایش"
                : "Restore a previous editor state"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="editor-icon-btn"
          >
            <X size={16} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {visible.map((entry) => {
            const entryIndex = entries.findIndex((e) => e.id === entry.id);
            const active = entryIndex === index;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onRestore(entryIndex)}
                  className={cn(
                    "mb-1 w-full rounded-lg px-3 py-2.5 text-start transition",
                    active
                      ? "bg-[color:var(--ed-select-soft)] text-[color:var(--ed-fg)]"
                      : "text-[color:var(--ed-muted)] hover:bg-white/[0.05] hover:text-[color:var(--ed-fg)]",
                  )}
                >
                  <span className="block text-[13px] font-medium">
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[color:var(--ed-subtle)]">
                    {new Date(entry.createdAt).toLocaleTimeString(
                      isFa ? "fa-IR" : "en-US",
                      { hour: "2-digit", minute: "2-digit", second: "2-digit" },
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
