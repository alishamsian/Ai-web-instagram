import { metricDisplay } from "@/components/admin/format";
import type { MetricResult } from "@/lib/admin/contracts";

export function MetricCell({
  metric,
  style,
}: {
  metric: MetricResult<number>;
  style?: "number" | "percent" | "currency";
}) {
  const d = metricDisplay(metric, { style, compact: true });
  if (d.kind === "unavailable") {
    return (
      <span className="text-[var(--admin-muted)]" title={d.reason}>
        —
      </span>
    );
  }
  if (d.kind === "partial") {
    return (
      <span title={d.warning} className="tabular-nums">
        {d.text}
      </span>
    );
  }
  return <span className="tabular-nums">{d.text}</span>;
}
