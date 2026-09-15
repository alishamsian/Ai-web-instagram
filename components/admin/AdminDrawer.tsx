"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-md flex-col border-s border-[var(--admin-border)] bg-[var(--admin-card)] shadow-[var(--admin-elevated)]",
          "animate-in slide-in-from-inline-end duration-200",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[var(--admin-fg)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-[var(--admin-muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-muted-bg)]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-[var(--admin-border)] px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
