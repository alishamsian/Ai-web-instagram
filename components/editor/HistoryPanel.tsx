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
      <aside className="relative z-10 flex h-full w-full max-w-sm flex-col border-s border-white/10 bg-[#0D0D0F] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-[#F7F7F8]">
              {isFa ? "تاریخچه" : "History"}
            </p>
            <p className="text-[11px] text-[#77777F]">
              {isFa
                ? "بازیابی وضعیت قبلی ویرایش"
                : "Restore a previous editor state"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-[#77777F] hover:bg-white/[0.06]"
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
                      ? "bg-white/[0.1] text-[#F7F7F8]"
                      : "text-[#B5B5BC] hover:bg-white/[0.05]",
                  )}
                >
                  <span className="block text-[13px] font-medium">
                    {entry.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#77777F]">
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
