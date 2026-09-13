"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppDialogSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<AppDialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  showClose = true,
  className,
  contentClassName,
  closeLabel = "Close",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: AppDialogSize;
  showClose?: boolean;
  className?: string;
  contentClassName?: string;
  closeLabel?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[80] bg-ink/45 backdrop-blur-[3px]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        </Dialog.Overlay>

        <div className="fixed inset-0 z-[81] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <Dialog.Content
            asChild
            onOpenAutoFocus={(event) => {
              const root = event.currentTarget as HTMLElement | null;
              const target = root?.querySelector<HTMLElement>(
                "[data-dialog-primary]",
              );
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }}
          >
            <motion.div
              className={cn(
                "relative flex w-full flex-col overflow-hidden outline-none",
                "rounded-t-[1.35rem] border border-border bg-white",
                "shadow-[0_28px_90px_rgba(0,0,0,0.28)]",
                "sm:rounded-2xl",
                "max-h-[min(92dvh,40rem)]",
                "pb-[env(safe-area-inset-bottom)]",
                SIZE_CLASS[size],
                className,
              )}
              initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
                aria-hidden
              />

              {(title || description || showClose) && (
                <div className="flex items-start justify-between gap-3 border-b border-border/80 px-5 pb-4 pt-3 sm:pt-5">
                  <div className="min-w-0 flex-1">
                    {title ? (
                      <Dialog.Title className="font-display text-xl tracking-tight text-ink">
                        {title}
                      </Dialog.Title>
                    ) : (
                      <Dialog.Title className="sr-only">Dialog</Dialog.Title>
                    )}
                    {description ? (
                      <Dialog.Description className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        {description}
                      </Dialog.Description>
                    ) : null}
                  </div>
                  {showClose ? (
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-ink"
                        aria-label={closeLabel}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </Dialog.Close>
                  ) : null}
                </div>
              )}

              {children ? (
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto px-5 py-5",
                    contentClassName,
                  )}
                >
                  {children}
                </div>
              ) : null}

              {footer ? (
                <div className="flex flex-col-reverse gap-2 border-t border-border bg-[#fafaf8] px-5 py-4 sm:flex-row sm:justify-end">
                  {footer}
                </div>
              ) : null}
            </motion.div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
