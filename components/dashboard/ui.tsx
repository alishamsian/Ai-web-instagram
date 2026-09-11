import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: "neutral" | "success" | "warning" | "danger" | "accent";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-emerald-500/12 text-emerald-700",
        tone === "warning" && "bg-amber-500/14 text-amber-800",
        tone === "danger" && "bg-red-500/12 text-red-700",
        tone === "accent" && "bg-ink/8 text-ink",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "neutral" && "bg-muted-foreground/50",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-red-500",
          tone === "accent" && "bg-ink",
        )}
        aria-hidden
      />
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-[1.85rem] leading-none tracking-tight text-ink">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-muted text-ink">
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-[linear-gradient(180deg,#fff_0%,#fafafa_100%)] px-6 py-14 text-center md:px-10">
      <div className="mx-auto mb-5 size-12 rounded-2xl bg-muted ring-1 ring-border" aria-hidden />
      <h2 className="font-display text-2xl tracking-tight text-ink">{title}</h2>
      {body ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-[1.85rem] leading-tight tracking-tight text-ink md:text-[2.15rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
