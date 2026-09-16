import type { ComparableMetric, MetricResult } from "@/lib/admin/contracts";
import { MetricUnavailable } from "@/components/admin/primitives";
import { comparableValue, metricDisplay } from "@/components/admin/format";
import { cn } from "@/lib/utils";
import { AdminSparkline } from "@/components/admin/AdminChart";

export function AdminMetricCard({
  label,
  metric,
  comparable,
  sparkline,
  href,
  style,
  compact,
}: {
  label: string;
  metric?: MetricResult<number>;
  comparable?: ComparableMetric;
  sparkline?: number[];
  href?: string;
  style?: "number" | "percent" | "currency";
  compact?: boolean;
}) {
  const source = comparable ?? null;
  const display = source
    ? comparableValue(source, { style, compact: true }).display
    : metric
      ? metricDisplay(metric, { style, compact: true })
      : null;
  const delta = source
    ? comparableValue(source, { style }).delta
    : null;

  if (!display) return null;

  if (display.kind === "unavailable" || display.kind === "permission_denied") {
    return (
      <MetricUnavailable
        label={label}
        reason={
          display.kind === "permission_denied"
            ? `Permission denied: ${display.reason}`
            : display.reason
        }
        compact={compact}
      />
    );
  }

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-[var(--admin-muted)]">
          {label}
        </p>
        {delta ? (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              delta.tone === "up" && "bg-emerald-500/12 text-emerald-600",
              delta.tone === "down" && "bg-red-500/12 text-red-600",
              delta.tone === "flat" &&
                "bg-[var(--admin-muted-bg)] text-[var(--admin-muted)]",
            )}
          >
            {delta.text}
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-[1.65rem] leading-none tracking-tight text-[var(--admin-fg)] tabular-nums">
        {display.text}
      </p>
      {display.kind === "partial" ? (
        <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
          {display.warning}
        </p>
      ) : null}
      {sparkline && sparkline.length > 1 ? (
        <div className="mt-3">
          <AdminSparkline values={sparkline} />
        </div>
      ) : null}
    </>
  );

  const className = cn(
    "rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] transition-colors",
    compact ? "p-3.5" : "p-4 sm:p-5",
    href && "hover:border-[var(--admin-fg)]/20",
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}
