import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import {
  getActivationIntelligence,
  getBusinessIntelligence,
  getDataQualityReport,
} from "@/lib/admin/phase6-queries";
import {
  AdminPageHeader,
  AdminCard,
  AdminSection,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { adminHref } from "@/components/admin/nav";
import type { DateRangePreset } from "@/lib/admin/dates";
import type { MetricResult } from "@/lib/admin/contracts";

function metricText(m: MetricResult<number>, asPct = false) {
  if (m.status === "unavailable" || m.status === "error") {
    return { kind: "unavailable" as const, text: m.reason };
  }
  if (m.status === "insufficient_sample") {
    return { kind: "unavailable" as const, text: m.reason };
  }
  const v =
    m.status === "available" || m.status === "partial" ? m.value : null;
  if (v == null) return { kind: "unavailable" as const, text: "—" };
  return {
    kind: "value" as const,
    text: asPct ? `${(v * 100).toFixed(1)}%` : v.toLocaleString(),
    warning: m.status === "partial" ? m.warning : undefined,
  };
}

export default async function AdminAnalyticsHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const preset = (sp.range as DateRangePreset) || "30d";
  const isFa = locale === "fa";

  const [activation, business, quality] = await Promise.all([
    getActivationIntelligence({ userId, preset }),
    getBusinessIntelligence({ userId, preset }),
    getDataQualityReport({ userId, preset }),
  ]);

  const links = [
    { href: "/analytics/funnels", label: isFa ? "قیف" : "Funnels" },
    { href: "/analytics/retention", label: isFa ? "نگه‌داشت" : "Retention" },
    { href: "/analytics/cohorts", label: isFa ? "هم‌گروه" : "Cohorts" },
    { href: "/analytics/features", label: isFa ? "فیچر" : "Features" },
    { href: "/analytics/product", label: isFa ? "محصول" : "Product" },
    { href: "/analytics/users", label: isFa ? "کاربران" : "Users" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "هوش تحلیلی" : "Analytics Intelligence"}
        description={
          isFa
            ? "فقط متریک‌های مبتنی بر داده واقعی — بدون عدد ساختگی"
            : "Real-data metrics only — never invented numbers"
        }
      />

      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={adminHref(locale, l.href)}
            prefetch={false}
            className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs hover:bg-[var(--admin-muted-bg)]/50"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <AdminSection
        title={isFa ? "فعال‌سازی" : "Activation"}
        description={activation.definition.description}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["Eligible users", activation.eligibleUsers, false],
              ["Activated users", activation.activatedUsers, false],
              ["Activation rate", activation.activationRate, true],
              ["Drop-off", activation.dropOff, true],
            ] as const
          ).map(([label, metric, asPct]) => {
            const d = metricText(metric, asPct);
            return (
              <AdminCard key={label} className="!p-4">
                <p className="text-[11px] text-[var(--admin-muted)]">{label}</p>
                {d.kind === "unavailable" ? (
                  <p className="mt-2 text-sm text-[var(--admin-muted)]">
                    Unavailable
                    <span className="mt-1 block text-[11px]">
                      Reason: {d.text}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 font-display text-2xl tabular-nums text-[var(--admin-fg)]">
                    {d.text}
                  </p>
                )}
              </AdminCard>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[var(--admin-muted)]">
          Median time-to-activation:{" "}
          {metricText(activation.medianHoursToActivation).kind === "value"
            ? `${metricText(activation.medianHoursToActivation).text}h`
            : "Insufficient data"}
        </p>
      </AdminSection>

      <AdminSection title={isFa ? "کسب‌وکار" : "Business"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminCard className="!p-4">
            <p className="text-[11px] text-[var(--admin-muted)]">Revenue</p>
            <MetricUnavailable
              label="Revenue"
              reason={
                business.revenue.status === "unavailable"
                  ? business.revenue.reason
                  : "Revenue unavailable"
              }
            />
          </AdminCard>
          <AdminCard className="!p-4">
            <p className="text-[11px] text-[var(--admin-muted)]">MRR</p>
            <MetricUnavailable
              label="MRR"
              reason={
                business.mrr.status === "unavailable"
                  ? business.mrr.reason
                  : "MRR unavailable"
              }
            />
          </AdminCard>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {business.planDistribution.map((p) => (
            <AdminStatusBadge key={p.plan} tone="neutral">
              {p.plan}: {p.count}
            </AdminStatusBadge>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title={isFa ? "کیفیت داده" : "Data quality"}
        description={
          isFa
            ? "جدا از متریک‌های کسب‌وکار"
            : "Separate from business metrics"
        }
      >
        {quality.issues.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">
            {isFa ? "مشکل کیفیت داده در نمونه مشاهده نشد." : "No DQ issues in sample."}
          </p>
        ) : (
          <ul className="space-y-2">
            {quality.issues.map((issue) => (
              <li key={issue.code}>
                <AdminCard className="!p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-[var(--admin-fg)]">
                        {issue.title}
                      </p>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        {issue.detail}
                        {issue.count != null ? ` · count=${issue.count}` : ""}
                      </p>
                    </div>
                    <AdminStatusBadge
                      tone={
                        issue.severity === "critical"
                          ? "danger"
                          : issue.severity === "warning"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {issue.severity}
                    </AdminStatusBadge>
                  </div>
                </AdminCard>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
