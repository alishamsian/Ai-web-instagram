import type { ActivityItem } from "@/lib/admin/contracts";
import { AdminEmptyState, AdminStatusBadge } from "@/components/admin/primitives";
import { relativeTime } from "@/components/admin/format";
import type { Locale } from "@/lib/config/env";

export function AdminActivityFeed({
  items,
  locale,
}: {
  items: ActivityItem[];
  locale: Locale;
}) {
  if (!items.length) {
    return (
      <AdminEmptyState
        title={locale === "fa" ? "فعالیتي ثبت نشده" : "No activity yet"}
        body={
          locale === "fa"
            ? "رویدادهای محصول، سیستم و ممیزی اینجا ظاهر می‌شوند."
            : "Product, system, and audit events will appear here."
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-4 py-3">
          <AdminStatusBadge
            tone={
              item.kind === "audit"
                ? "info"
                : item.kind === "system"
                  ? "warning"
                  : "neutral"
            }
          >
            {item.kind}
          </AdminStatusBadge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--admin-fg)]">
              {item.action}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--admin-muted)]">
              {[item.resourceType, item.resourceId, item.summary]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <time
            className="shrink-0 text-[11px] tabular-nums text-[var(--admin-muted)]"
            dateTime={item.occurredAt}
          >
            {relativeTime(item.occurredAt, locale)}
          </time>
        </li>
      ))}
    </ul>
  );
}
