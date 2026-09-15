import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[var(--admin-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--admin-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl tracking-tight text-[var(--admin-fg)] sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--admin-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-[var(--admin-fg)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatusBadge({
  tone,
  children,
}: {
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
        tone === "neutral" &&
          "bg-[var(--admin-muted-bg)] text-[var(--admin-muted)]",
        tone === "success" && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
        tone === "warning" && "bg-amber-500/14 text-amber-700 dark:text-amber-300",
        tone === "danger" && "bg-red-500/12 text-red-600 dark:text-red-400",
        tone === "info" && "bg-sky-500/12 text-sky-700 dark:text-sky-300",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "neutral" && "bg-[var(--admin-muted)]",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-red-500",
          tone === "info" && "bg-sky-500",
        )}
        aria-hidden
      />
      {children}
    </span>
  );
}

export function MetricUnavailable({
  label,
  reason,
  compact,
}: {
  label: string;
  reason: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-card)]",
        compact ? "p-3.5" : "p-4 sm:p-5",
      )}
    >
      <p className="text-[11px] font-medium text-[var(--admin-muted)]">{label}</p>
      <p className="mt-2 font-display text-2xl tracking-tight text-[var(--admin-muted)]">
        —
      </p>
      <p className="mt-2 text-[11px] leading-5 text-[var(--admin-muted)]">
        {reason}
      </p>
    </div>
  );
}

export function AdminEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-card)] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--admin-fg)]">{title}</p>
      {body ? (
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-[var(--admin-muted)]">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function AdminErrorState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/25 bg-red-500/5 px-5 py-6"
    >
      <p className="text-sm font-medium text-red-700 dark:text-red-300">
        {title}
      </p>
      {body ? (
        <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">{body}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-xs font-medium text-[var(--admin-fg)] underline-offset-2 hover:underline"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function AdminLoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl bg-[var(--admin-muted-bg)]"
        />
      ))}
    </div>
  );
}

export function AdminComingSoon({
  title,
  locale,
}: {
  title: string;
  locale: "fa" | "en";
}) {
  return (
    <AdminEmptyState
      title={title}
      body={
        locale === "fa"
          ? "این بخش در فازهای بعدی فعال می‌شود. فعلاً داده یا عملیات جعلی نمایش داده نمی‌شود."
          : "This area ships in a later phase. No fake data or stubbed actions are shown."
      }
    />
  );
}
