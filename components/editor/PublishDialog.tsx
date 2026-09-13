"use client";

import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { PublishPreflightResult } from "@/lib/editor/validation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function PublishDialog({
  open,
  dict,
  locale,
  isPublished,
  changes,
  publishing,
  error,
  preflight,
  onClose,
  onConfirm,
}: {
  open: boolean;
  dict: Dictionary;
  locale: Locale;
  isPublished: boolean;
  changes: string[];
  publishing: boolean;
  error?: string | null;
  preflight?: PublishPreflightResult | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const isFa = locale === "fa";
  const blocked = Boolean(preflight && !preflight.ok && !isPublished);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border border-white/10 bg-[#0D0D0F] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[15px] font-medium text-[#F7F7F8]">
              {isPublished
                ? dict.editor.unpublishConfirmTitle
                : dict.editor.publishConfirmTitle}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#77777F]">
              {isPublished
                ? dict.editor.unpublishConfirmBody
                : dict.editor.publishConfirmBody}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-[#77777F] hover:bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        {!isPublished && preflight ? (
          <div className="space-y-2 border-b border-white/[0.06] px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#77777F]">
              {isFa ? "پیش‌پرواز انتشار" : "Publish preflight"}
            </p>
            {preflight.errors.map((issue) => (
              <p key={issue.id} className="text-[12px] text-red-300">
                {issue.message[locale]}
              </p>
            ))}
            {preflight.warnings.map((issue) => (
              <p key={issue.id} className="text-[12px] text-amber-300">
                {issue.message[locale]}
              </p>
            ))}
            {preflight.errors.length === 0 && preflight.warnings.length === 0 ? (
              <p className="text-[12px] text-emerald-300">
                {isFa ? "آماده انتشار" : "Ready to publish"}
              </p>
            ) : null}
          </div>
        ) : null}

        {!isPublished && changes.length > 0 ? (
          <ul className="space-y-1.5 border-b border-white/[0.06] px-5 py-4">
            {changes.map((change) => (
              <li
                key={change}
                className="flex items-center gap-2 text-[12px] text-[#B5B5BC]"
              >
                <span className="size-1.5 rounded-full bg-[#FF6B57]" />
                {change}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div className="border-b border-white/[0.06] px-5 py-3 text-[12px] leading-5 text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-[#B5B5BC] hover:bg-white/[0.06] hover:text-[#F7F7F8]"
          >
            {dict.editor.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={publishing || blocked}
            onClick={onConfirm}
            className="bg-[#FF6B57] text-white hover:bg-[#ff7d6c]"
          >
            {publishing
              ? "…"
              : isPublished
                ? dict.editor.unpublish
                : dict.editor.publishWebsite}
          </Button>
        </div>
      </div>
    </div>
  );
}
