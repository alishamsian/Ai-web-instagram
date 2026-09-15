import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminSecurityOverview } from "@/lib/admin/phase5-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminEmptyState,
  AdminStatusBadge,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";
import { adminHref } from "@/components/admin/nav";
import Link from "next/link";

export default async function AdminSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "audit.read");
  const isFa = locale === "fa";
  const overview = await getAdminSecurityOverview({ userId });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "مرکز امنیت" : "Security Center"}
        description={
          isFa
            ? "دسترسی ادمین، اقدامات حساس، و رویدادهای امنیتی — بدون داده جعلی"
            : "Admin access, sensitive actions, and security events — no invented data"
        }
      />

      <AdminSection title={isFa ? "دسترسی ادمین" : "Admin access"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            label={isFa ? "ادمین فعال" : "Active admins"}
            metric={overview.activeAdmins}
          />
          <AdminMetricCard
            label={isFa ? "ادمین غیرفعال" : "Inactive admins"}
            metric={overview.inactiveAdmins}
          />
          <AdminMetricCard
            label={isFa ? "رویداد امنیتی ۲۴س" : "Security events 24h"}
            metric={overview.recentSecurityEvents}
          />
          <AdminMetricCard
            label={isFa ? "رد دسترسی ۲۴س" : "Denied 24h"}
            metric={overview.recentDenied}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--admin-muted)]">
                <th className="py-2">{isFa ? "نقش" : "Role"}</th>
                <th className="py-2">{isFa ? "تعداد فعال" : "Active count"}</th>
              </tr>
            </thead>
            <tbody>
              {overview.roles.map((r) => (
                <tr key={r.role} className="border-t border-[var(--admin-border)]">
                  <td className="py-2 font-mono text-xs">{r.role}</td>
                  <td className="py-2 tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection
        title={isFa ? "اقدامات حساس (RBAC)" : "Sensitive actions (RBAC)"}
        description={
          isFa
            ? "deny-by-default — فقط نقش‌هایی که صریحاً مجوز دارند"
            : "Deny-by-default — only roles with explicit grants"
        }
      >
        <AdminDataTable
          locale={locale}
          rows={overview.sensitivePermissions}
          searchPlaceholder="permission…"
          emptyTitle=""
          columns={[
            {
              id: "permission",
              header: isFa ? "مجوز" : "Permission",
              cell: (r) => (
                <span className="font-mono text-xs">{r.permission}</span>
              ),
            },
            {
              id: "roles",
              header: isFa ? "نقش‌ها" : "Roles",
              cell: (r) => r.roles.join(", ") || "—",
            },
          ]}
        />
      </AdminSection>

      <AdminSection title={isFa ? "اقدامات حساس اخیر (ممیزی)" : "Recent sensitive audits"}>
        <AdminMetricCard
          label={isFa ? "اقدامات حساس ۲۴س" : "Sensitive actions 24h"}
          metric={overview.recentSensitiveActions}
        />
        <p className="mt-3 text-xs text-[var(--admin-muted)]">
          <Link href={adminHref(locale, "/audit")} prefetch={false} className="underline">
            {isFa ? "باز کردن ممیزی کامل" : "Open full audit log"}
          </Link>
        </p>
      </AdminSection>

      <AdminSection title={isFa ? "رویدادهای امنیتی" : "Security events"}>
        {overview.recentSecurityEvents.status === "unavailable" ? (
          <MetricUnavailable
            label={isFa ? "رویدادهای امنیتی" : "Security events"}
            reason={overview.recentSecurityEvents.reason}
            compact
          />
        ) : !overview.recentEvents.length ? (
          <AdminEmptyState
            title={isFa ? "رویدادی نیست" : "No events"}
            body={
              isFa
                ? "هنوز رویداد امنیتی ثبت نشده است."
                : "No security events recorded yet."
            }
          />
        ) : (
          <AdminDataTable
            locale={locale}
            rows={overview.recentEvents}
            searchPlaceholder="event…"
            emptyTitle=""
            columns={[
              {
                id: "event",
                header: isFa ? "رویداد" : "Event",
                cell: (r) => r.eventName,
              },
              {
                id: "severity",
                header: isFa ? "شدت" : "Severity",
                cell: (r) => (
                  <AdminStatusBadge
                    tone={
                      r.severity === "critical"
                        ? "danger"
                        : r.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {r.severity}
                  </AdminStatusBadge>
                ),
              },
              {
                id: "actor",
                header: isFa ? "عامل" : "Actor",
                cell: (r) => r.actorRole ?? r.actorUserId?.slice(0, 8) ?? "—",
              },
              {
                id: "when",
                header: isFa ? "زمان" : "When",
                sortValue: (r) => r.occurredAt,
                cell: (r) => relativeTime(r.occurredAt, locale),
              },
            ]}
          />
        )}
      </AdminSection>
    </div>
  );
}
