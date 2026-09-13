"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/config/env";
import { cn } from "@/lib/utils";
import {
  Check,
  Eye,
  EyeOff,
  History,
  LayoutTemplate,
  Redo2,
  Search,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";

export type EditorCommandItem = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
};

export function EditorCommandPalette({
  open,
  locale,
  commands,
  onClose,
}: {
  open: boolean;
  locale: Locale;
  commands: EditorCommandItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const isFa = locale === "fa";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = filtered[active];
        if (item) {
          item.run();
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/55 p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isFa ? "پالت فرمان" : "Command palette"}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#0D0D0F] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
          <Search size={15} className="text-[#77777F]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isFa ? "جستجوی فرمان…" : "Search commands…"}
            className="h-9 w-full bg-transparent text-[14px] text-[#F7F7F8] outline-none placeholder:text-[#55555C]"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-[#77777F]">
            esc
          </kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-[12px] text-[#77777F]">
              {isFa ? "فرمانی پیدا نشد" : "No commands"}
            </li>
          ) : (
            filtered.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start transition",
                    index === active
                      ? "bg-white/[0.08] text-[#F7F7F8]"
                      : "text-[#B5B5BC] hover:bg-white/[0.04]",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[#77777F]">
                      {item.group}
                      {item.hint ? ` · ${item.hint}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export const COMMAND_ICONS = {
  undo: Undo2,
  redo: Redo2,
  history: History,
  preview: Eye,
  hide: EyeOff,
  delete: Trash2,
  theme: Sparkles,
  section: LayoutTemplate,
  check: Check,
};
