"use client";

import { cn } from "@/lib/utils";

export function AdminSparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const w = 120;
  const h = 28;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-7 w-full text-[var(--admin-fg)]", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
        points={points}
      />
    </svg>
  );
}

export function AdminLineChart({
  points,
  label,
  emptyLabel,
  unavailableReason,
}: {
  points: { date: string; value: number }[];
  label: string;
  emptyLabel: string;
  unavailableReason?: string;
}) {
  if (unavailableReason) {
    return (
      <div className="flex h-48 flex-col justify-center rounded-xl border border-dashed border-[var(--admin-border)] px-4 text-center">
        <p className="text-sm font-medium text-[var(--admin-fg)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          {unavailableReason}
        </p>
      </div>
    );
  }

  if (!points.length) {
    return (
      <div className="flex h-48 flex-col justify-center rounded-xl border border-dashed border-[var(--admin-border)] px-4 text-center">
        <p className="text-sm font-medium text-[var(--admin-fg)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">{emptyLabel}</p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const w = 560;
  const h = 160;
  const pad = 12;
  const path = points
    .map((p, i) => {
      const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - (p.value / max) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--admin-fg)]">{label}</h3>
        <p className="text-[11px] tabular-nums text-[var(--admin-muted)]">
          max {max}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-40 w-full text-[var(--admin-fg)]"
        role="img"
        aria-label={label}
      >
        <path
          d={`M${pad},${h - pad} H${w - pad}`}
          stroke="var(--admin-border)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--admin-muted)]">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}
