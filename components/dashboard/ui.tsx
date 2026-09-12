import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  tone,
  children,
  className,
}: {
  /** `default` is an alias for `neutral` (used by order actions). */
  tone: "neutral" | "default" | "success" | "warning" | "danger" | "accent";
  children: ReactNode;
  className?: string;
}) {
  const resolved = tone === "default" ? "neutral" : tone;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        resolved === "neutral" && "bg-muted text-muted-foreground",
        resolved === "success" && "bg-emerald-500/12 text-emerald-700",
        resolved === "warning" && "bg-amber-500/14 text-amber-800",
        resolved === "danger" && "bg-red-500/12 text-red-700",
        resolved === "accent" && "bg-ink/8 text-ink",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          resolved === "neutral" && "bg-muted-foreground/50",
          resolved === "success" && "bg-emerald-500",
          resolved === "warning" && "bg-amber-500",
          resolved === "danger" && "bg-red-500",
          resolved === "accent" && "bg-ink",
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
        "group relative overflow-hidden rounded-2xl border border-border bg-white p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-5",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/15 to-transparent"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground sm:text-[12px]">
            {label}
          </p>
          <p className="mt-1.5 font-display text-[1.45rem] leading-none tracking-tight text-ink tabular-nums sm:mt-2 sm:text-[1.85rem]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-muted-foreground sm:mt-2 sm:text-[12px]">
              {hint}
            </p>
          ) : null}
        </div>
        {icon ? (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-ink ring-1 ring-border/70 transition-colors group-hover:bg-ink group-hover:text-white sm:size-10">
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
  steps,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
  steps?: { label: string; href?: string; done?: boolean }[];
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-[linear-gradient(165deg,#fff_0%,#fafafa_55%,#f5f5f5_100%)] px-4 py-10 text-center sm:px-6 sm:py-14 md:px-10">
      <div
        className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-white text-ink shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-border sm:mb-5 sm:size-14"
        aria-hidden
      >
        {icon ?? <span className="size-5 rounded-md bg-muted" />}
      </div>
      <h2 className="font-display text-xl tracking-tight text-ink sm:text-2xl">
        {title}
      </h2>
      {body ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {body}
        </p>
      ) : null}
      {steps && steps.length > 0 ? (
        <ol className="mx-auto mt-6 max-w-sm space-y-2 text-start">
          {steps.map((step, index) => {
            const content = (
              <span className="flex items-start gap-2.5 text-sm">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium tabular-nums",
                    step.done
                      ? "bg-emerald-500/15 text-emerald-800"
                      : "bg-ink/8 text-ink",
                  )}
                >
                  {step.done ? "✓" : index + 1}
                </span>
                <span
                  className={cn(
                    "leading-5",
                    step.done
                      ? "text-muted-foreground line-through"
                      : "text-ink",
                  )}
                >
                  {step.label}
                </span>
              </span>
            );
            return (
              <li key={`${step.label}-${index}`}>
                {step.href && !step.done ? (
                  <a
                    href={step.href}
                    className="block rounded-xl px-3 py-2 transition-colors hover:bg-white"
                  >
                    {content}
                  </a>
                ) : (
                  <div className="px-3 py-2">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
      {action ? (
        <div className="mt-7 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-[1.55rem] leading-tight tracking-tight text-ink sm:text-[1.85rem] md:text-[2.15rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-muted-foreground sm:mt-2 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
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
            "flex flex-col gap-3 border-b border-border px-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5",
            description ? "py-4" : "sm:items-center py-4",
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
          {action ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {action}
            </div>
          ) : null}
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
        "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          {meta}
        </div>
        {detail ? (
          <p className="mt-1 break-words text-xs text-muted-foreground sm:truncate">
            {detail}
          </p>
        ) : null}
      </div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {trailing}
        </div>
      ) : null}
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
