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
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-[1.85rem] leading-none tracking-tight text-ink tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-ink ring-1 ring-border/70 transition-colors group-hover:bg-ink group-hover:text-white">
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
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-[linear-gradient(165deg,#fff_0%,#fafafa_55%,#f5f5f5_100%)] px-6 py-14 text-center md:px-10">
      <div
        className="mx-auto mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-white text-ink shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-border"
        aria-hidden
      >
        {icon ?? <span className="size-5 rounded-md bg-muted" />}
      </div>
      <h2 className="font-display text-2xl tracking-tight text-ink">{title}</h2>
      {body ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-7 flex justify-center gap-2">{action}</div> : null}
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
  description,
  action,
  flush,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      {title ? (
        <div
          className={cn(
            "flex items-start justify-between gap-3 border-b border-border px-5",
            description ? "py-4" : "items-center py-4",
          )}
        >
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={flush ? undefined : undefined}>{children}</div>
    </section>
  );
}

export function SoftBanner({
  children,
  tone = "warning",
  className,
}: {
  children: ReactNode;
  tone?: "warning" | "info" | "success";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5 text-sm leading-6",
        tone === "warning" &&
          "border-amber-200/80 bg-amber-50 text-amber-950",
        tone === "info" && "border-border bg-white text-ink",
        tone === "success" &&
          "border-emerald-200/80 bg-emerald-50 text-emerald-950",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListRow({
  title,
  detail,
  meta,
  trailing,
  className,
}: {
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-5 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          {meta}
        </div>
        {detail ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function KeyValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm text-ink">{value}</dd>
    </div>
  );
}

export function PageStack({ children }: { children: ReactNode }) {
  return <div className="space-y-6 md:space-y-8">{children}</div>;
}
