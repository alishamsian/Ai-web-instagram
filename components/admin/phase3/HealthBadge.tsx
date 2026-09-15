import type { HealthAssessment, HealthLevel } from "@/lib/admin/health";
import { AdminStatusBadge } from "@/components/admin/primitives";

const TONE: Record<
  HealthLevel,
  "success" | "warning" | "danger" | "neutral"
> = {
  healthy: "success",
  needs_attention: "warning",
  blocked: "danger",
  at_risk: "danger",
};

const LABEL: Record<HealthLevel, { fa: string; en: string }> = {
  healthy: { fa: "سالم", en: "Healthy" },
  needs_attention: { fa: "نیاز به توجه", en: "Needs Attention" },
  blocked: { fa: "مسدود", en: "Blocked" },
  at_risk: { fa: "در خطر (قانونی)", en: "At Risk — rule-based" },
};

export function HealthBadge({
  health,
  locale,
}: {
  health: HealthAssessment | null | undefined;
  locale: "fa" | "en";
}) {
  if (!health) {
    return <AdminStatusBadge tone="neutral">n/a</AdminStatusBadge>;
  }
  return (
    <AdminStatusBadge tone={TONE[health.level]}>
      {LABEL[health.level][locale]}
    </AdminStatusBadge>
  );
}

export function HealthSignalList({
  health,
  locale,
}: {
  health: HealthAssessment;
  locale: "fa" | "en";
}) {
  if (!health.signals.length) {
    return (
      <p className="text-xs text-[var(--admin-muted)]">
        {locale === "fa"
          ? "سیگنال منفی یافت نشد (چارچوب قانون‌محور)."
          : "No adverse signals (rule-based framework)."}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {health.signals.map((s) => (
        <li
          key={s.code}
          className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs"
        >
          <p className="font-medium text-[var(--admin-fg)]">{s.reason}</p>
          <p className="mt-0.5 text-[var(--admin-muted)]">{s.evidence}</p>
          <p className="mt-1 text-[var(--admin-muted)]">
            → {s.recommendedAction}
          </p>
        </li>
      ))}
    </ul>
  );
}
