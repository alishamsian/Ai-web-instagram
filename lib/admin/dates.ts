/**
 * Centralized admin / dashboard date-range helpers (UTC).
 * UI must not invent its own period math.
 */

export type DateRangePreset =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "6m"
  | "12m"
  | "custom";

export type DateRange = {
  preset: DateRangePreset;
  /** Inclusive start (ISO). */
  start: string;
  /** Exclusive end (ISO) — convenient for SQL `lt end`. */
  end: string;
  /** IANA timezone label for display; calculations remain UTC unless noted. */
  timezone: string;
};

export type ComparisonPeriod = {
  current: DateRange;
  previous: DateRange;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(d: Date, months: number): Date {
  const next = new Date(d.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function resolveDateRange(params: {
  preset: DateRangePreset;
  now?: Date;
  timezone?: string;
  customStart?: string;
  customEnd?: string;
}): DateRange {
  const now = params.now ?? new Date();
  const timezone = params.timezone ?? "UTC";
  const today = startOfUtcDay(now);
  const endExclusive = addUtcDays(today, 1);

  if (params.preset === "custom") {
    if (!params.customStart || !params.customEnd) {
      throw new Error("custom range requires customStart and customEnd");
    }
    const start = new Date(params.customStart);
    const end = new Date(params.customEnd);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new Error("invalid custom date range");
    }
    if (end <= start) {
      throw new Error("customEnd must be after customStart");
    }
    return {
      preset: "custom",
      start: start.toISOString(),
      end: end.toISOString(),
      timezone,
    };
  }

  let start: Date;
  switch (params.preset) {
    case "today":
      start = today;
      break;
    case "7d":
      start = addUtcDays(today, -6);
      break;
    case "30d":
      start = addUtcDays(today, -29);
      break;
    case "90d":
      start = addUtcDays(today, -89);
      break;
    case "6m":
      start = addUtcMonths(today, -6);
      break;
    case "12m":
      start = addUtcMonths(today, -12);
      break;
    default:
      start = addUtcDays(today, -29);
  }

  return {
    preset: params.preset,
    start: start.toISOString(),
    end: endExclusive.toISOString(),
    timezone,
  };
}

/** Previous period of equal length immediately before `current`. */
export function resolveComparisonPeriod(current: DateRange): ComparisonPeriod {
  const startMs = Date.parse(current.start);
  const endMs = Date.parse(current.end);
  const duration = endMs - startMs;
  const prevEnd = new Date(startMs);
  const prevStart = new Date(startMs - duration);
  return {
    current,
    previous: {
      preset: "custom",
      start: prevStart.toISOString(),
      end: prevEnd.toISOString(),
      timezone: current.timezone,
    },
  };
}

export function dateKeysInRange(range: DateRange): string[] {
  const keys: string[] = [];
  let cursor = startOfUtcDay(new Date(range.start));
  const end = new Date(range.end);
  while (cursor < end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor = addUtcDays(cursor, 1);
  }
  return keys;
}
