import type { ComparableMetric, MetricResult } from "@/lib/admin/contracts";

export function formatMetricNumber(
  value: number,
  opts?: { style?: "number" | "percent" | "currency"; compact?: boolean },
): string {
  const style = opts?.style ?? "number";
  if (style === "percent") {
    return new Intl.NumberFormat("en", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (style === "currency") {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en", {
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function formatDelta(ratio: MetricResult<number>): {
  text: string;
  tone: "up" | "down" | "flat" | "none";
} | null {
  if (ratio.status !== "available") return null;
  const pct = ratio.value * 100;
  if (!Number.isFinite(pct)) return null;
  if (Math.abs(pct) < 0.05) return { text: "0%", tone: "flat" };
  const sign = pct > 0 ? "+" : "";
  return {
    text: `${sign}${pct.toFixed(1)}%`,
    tone: pct > 0 ? "up" : "down",
  };
}

export function metricDisplay(
  metric: MetricResult<number>,
  opts?: { style?: "number" | "percent" | "currency"; compact?: boolean },
):
  | { kind: "value"; text: string; source: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "partial"; text: string; warning: string; source: string } {
  if (metric.status === "unavailable") {
    return { kind: "unavailable", reason: metric.reason };
  }
  if (metric.status === "partial") {
    return {
      kind: "partial",
      text: formatMetricNumber(metric.value, opts),
      warning: metric.warning,
      source: metric.source,
    };
  }
  return {
    kind: "value",
    text: formatMetricNumber(metric.value, opts),
    source: metric.source,
  };
}

export function comparableValue(
  metric: ComparableMetric,
  opts?: { style?: "number" | "percent" | "currency"; compact?: boolean },
) {
  return {
    display: metricDisplay(metric.current, opts),
    delta: formatDelta(metric.deltaRatio),
  };
}

export function relativeTime(iso: string, locale: "fa" | "en"): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const diff = Date.now() - ms;
  const minutes = Math.round(diff / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale === "fa" ? "fa" : "en", {
    numeric: "auto",
  });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}

export function sanitizeAdminError(message: string): string {
  return message
    .replace(/password|token|api[_-]?key|secret|service.?role/gi, "[redacted]")
    .slice(0, 180);
}
