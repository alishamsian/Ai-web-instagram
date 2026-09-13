"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmTone = "default" | "danger" | "warning" | "success";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Extra detail under description (e.g. site name). */
  detail?: string;
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmToneStyle = {
  icon: LucideIcon;
  iconWrap: string;
  confirmClass?: string;
};

const TONE: Record<ConfirmTone, ConfirmToneStyle> = {
  default: {
    icon: Info,
    iconWrap: "bg-ink text-white",
  },
  danger: {
    icon: Trash2,
    iconWrap: "bg-red-600 text-white",
    confirmClass: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-500 text-white",
  },
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-600 text-white",
    confirmClass:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600",
  },
};

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const tone = state?.tone ?? "default";
  const style = TONE[tone];
  const Icon = style.icon;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AppDialog
        open={Boolean(state)}
        onOpenChange={(open) => {
          if (!open) close(false);
        }}
        size="sm"
        showClose
        closeLabel={state?.cancelLabel ?? "Close"}
        title={
          state ? (
            <span className="inline-flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
                  style.iconWrap,
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span>{state.title}</span>
            </span>
          ) : undefined
        }
        description={state?.description}
        footer={
          state ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => close(false)}
              >
                {state.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                data-dialog-primary
                className={cn("w-full sm:w-auto", style.confirmClass)}
                onClick={() => close(true)}
              >
                {state.confirmLabel ?? "Confirm"}
              </Button>
            </>
          ) : null
        }
      >
        {state?.detail ? (
          <div className="rounded-xl bg-[#f6f6f4] px-3.5 py-3 text-[13px] leading-6 text-ink ring-1 ring-border/70">
            {state.detail}
          </div>
        ) : null}
      </AppDialog>
    </ConfirmContext.Provider>
  );
}

/** Imperative confirm — must be used under ConfirmProvider. */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return confirm;
}

/**
 * Controlled confirm dialog (no provider). Use when you already own open state.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  detail,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  closeLabel = "Close",
}: ConfirmOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  closeLabel?: string;
}) {
  const style = TONE[tone];
  const Icon = style.icon;
  const [pending, setPending] = useState(false);
  const busy = pending || loading;

  async function handleConfirm() {
    if (busy) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        if (!next) setPending(false);
        onOpenChange(next);
      }}
      size="sm"
      showClose
      closeLabel={closeLabel}
      title={
        <span className="inline-flex items-center gap-3">
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
              style.iconWrap,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span>{title}</span>
        </span>
      }
      description={description}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            data-dialog-primary
            loading={busy}
            className={cn("w-full sm:w-auto", style.confirmClass)}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {detail ? (
        <div className="rounded-xl bg-[#f6f6f4] px-3.5 py-3 text-[13px] leading-6 text-ink ring-1 ring-border/70">
          {detail}
        </div>
      ) : null}
    </AppDialog>
  );
}
