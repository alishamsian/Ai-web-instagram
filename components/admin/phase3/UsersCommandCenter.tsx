"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { HealthBadge, HealthSignalList } from "@/components/admin/phase3/HealthBadge";
import { relativeTime } from "@/components/admin/format";
import { adminHref } from "@/components/admin/nav";
import { createAdminSupportNote } from "@/lib/admin/phase3-actions";
import type {
  AdminUserListItem,
  AdminUserMetricsBundle,
  AdminUser360,
} from "@/lib/admin/phase3-queries";
import type { Locale } from "@/lib/config/env";

export function UsersCommandCenter({
  locale,
  metrics,
  rows,
  initialFocus,
  canWriteNotes,
}: {
  locale: Locale;
  metrics: AdminUserMetricsBundle;
  rows: AdminUserListItem[];
  initialFocus?: string | null;
  canWriteNotes: boolean;
}) {
  const isFa = locale === "fa";
  const [focusId, setFocusId] = useState<string | null>(initialFocus ?? null);
  const [note, setNote] = useState("");
  const [detail, setDetail] = useState<AdminUser360 | null>(null);
  const [loading, setLoading] = useState(false);

  const focused = useMemo(
    () => rows.find((r) => r.id === focusId) ?? null,
    [rows, focusId],
  );

  async function openUser(id: string) {
    setFocusId(id);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/user-360?id=${encodeURIComponent(id)}`,
      );
      if (res.ok) {
        const payload = (await res.json()) as AdminUser360;
        setDetail(payload);
      } else {
        setDetail(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "کاربران" : "Users"}
        description={
          isFa
            ? "مدیریت و درک کاربران ویترین — بدون متریک جعلی"
            : "Manage and understand Vitrin users — no invented metrics"
        }
      />

      <AdminSection title={isFa ? "شاخص‌ها" : "Metrics"}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AdminMetricCard
            label={isFa ? "کل کاربران" : "Total Users"}
            metric={metrics.totalUsers}
          />
          <AdminMetricCard
            label={isFa ? "کاربران جدید" : "New Users"}
            metric={metrics.newUsers}
          />
          <AdminMetricCard
            label={isFa ? "دارای ورک‌اسپیس" : "With Workspace"}
            metric={metrics.withWorkspace}
          />
          <AdminMetricCard
            label={isFa ? "دارای سایت" : "With Website"}
            metric={metrics.withWebsite}
          />
          <AdminMetricCard
            label={isFa ? "منتشرکننده" : "Published Users"}
            metric={metrics.publishedUsers}
          />
          <AdminMetricCard
            label={isFa ? "آخرین فعالیت" : "Last Activity"}
            metric={metrics.lastActivity}
          />
        </div>
        {metrics.planDistribution.status === "available" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(metrics.planDistribution.value).map(([plan, n]) => (
              <AdminStatusBadge key={plan} tone="neutral">
                {plan}: {n}
              </AdminStatusBadge>
            ))}
          </div>
        ) : null}
      </AdminSection>

      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={
          isFa ? "جستجوی ایمیل یا نام…" : "Search email or name…"
        }
        emptyTitle={isFa ? "کاربری نیست" : "No users"}
        columns={[
          {
            id: "user",
            header: isFa ? "کاربر" : "User",
            sortValue: (r) => r.email,
            cell: (r) => (
              <button
                type="button"
                className="text-start font-medium text-[var(--admin-fg)] underline-offset-2 hover:underline"
                onClick={() => void openUser(r.id)}
              >
                {r.name || r.email}
                <span className="mt-0.5 block text-[11px] font-normal text-[var(--admin-muted)]">
                  {r.email}
                </span>
              </button>
            ),
          },
          {
            id: "created",
            header: isFa ? "ایجاد" : "Created",
            sortValue: (r) => r.createdAt,
            cell: (r) => relativeTime(r.createdAt, locale),
          },
          {
            id: "workspace",
            header: isFa ? "ورک‌اسپیس" : "Workspace",
            cell: (r) =>
              r.workspaceId ? (
                <Link
                  href={`${adminHref(locale, "/workspaces")}?focus=${r.workspaceId}`}
                  className="underline-offset-2 hover:underline"
                >
                  {r.workspaceName}
                </Link>
              ) : (
                "—"
              ),
          },
          {
            id: "plan",
            header: "Plan",
            sortValue: (r) => r.plan ?? "",
            cell: (r) => r.plan ?? "—",
          },
          {
            id: "sites",
            header: isFa ? "سایت‌ها" : "Websites",
            sortValue: (r) => r.websiteCount,
            cell: (r) => `${r.websiteCount} / ${r.publishedCount} pub`,
          },
          {
            id: "ai",
            header: "AI",
            sortValue: (r) => r.aiRequestCount ?? -1,
            cell: (r) =>
              r.aiRequestCount === null ? (
                <span
                  className="text-[var(--admin-muted)]"
                  title={
                    isFa
                      ? "نمونه AI برای این صفحه ناقص است"
                      : "AI sample truncated for this page"
                  }
                >
                  —
                </span>
              ) : (
                r.aiRequestCount
              ),
          },
          {
            id: "health",
            header: isFa ? "سلامت" : "Health",
            cell: (r) => <HealthBadge health={r.health} locale={locale} />,
          },
        ]}
      />

      <AdminDrawer
        open={Boolean(focusId)}
        onClose={() => {
          setFocusId(null);
          setDetail(null);
        }}
        title={focused?.name || focused?.email || "User 360"}
        subtitle={focused?.email}
        footer={
          canWriteNotes ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void createAdminSupportNote({
                  body: note,
                  targetUserId: focusId,
                  workspaceId: focused?.workspaceId,
                }).then(() => {
                  setNote("");
                  if (focusId) void openUser(focusId);
                });
              }}
            >
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isFa ? "یادداشت پشتیبانی…" : "Support note…"}
                className="h-9 flex-1 rounded-lg border border-[var(--admin-border)] bg-transparent px-3 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--admin-fg)] px-3 text-xs text-[var(--admin-bg)]"
              >
                {isFa ? "ثبت" : "Save"}
              </button>
            </form>
          ) : null
        }
      >
        {loading ? (
          <p className="text-xs text-[var(--admin-muted)]">Loading…</p>
        ) : detail ? (
          <div className="space-y-5 text-sm">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Account
              </h3>
              <p className="mt-1">Plan: {detail.user.plan ?? "—"}</p>
              <p>
                Websites: {detail.user.websiteCount} · Published:{" "}
                {detail.user.publishedCount}
              </p>
              <p>AI requests: {detail.user.aiRequestCount ?? "—"}</p>
            </section>
            {detail.entitlements ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Entitlements
                </h3>
                <ul className="mt-1 space-y-1 text-xs text-[var(--admin-muted)]">
                  <li>maxWebsites: {detail.entitlements.maxWebsites}</li>
                  <li>maxImports: {detail.entitlements.maxImports}</li>
                  <li>maxAiGenerations: {detail.entitlements.maxAiGenerations}</li>
                  <li>
                    customDomain:{" "}
                    {detail.entitlements.customDomain ? "yes" : "no"}
                  </li>
                </ul>
              </section>
            ) : null}
            {detail.user.health ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Health (rule-based)
                </h3>
                <HealthBadge health={detail.user.health} locale={locale} />
                <div className="mt-2">
                  <HealthSignalList health={detail.user.health} locale={locale} />
                </div>
              </section>
            ) : null}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Websites
              </h3>
              <ul className="mt-1 space-y-1">
                {detail.websites.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`${adminHref(locale, "/websites")}?focus=${w.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {w.slug}
                    </Link>{" "}
                    <AdminStatusBadge
                      tone={w.status === "published" ? "success" : "neutral"}
                    >
                      {w.status}
                    </AdminStatusBadge>
                  </li>
                ))}
                {!detail.websites.length ? (
                  <li className="text-xs text-[var(--admin-muted)]">—</li>
                ) : null}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Activity
              </h3>
              <ul className="mt-1 space-y-1 text-xs">
                {detail.recentActivity.map((a) => (
                  <li key={a.id} className="text-[var(--admin-muted)]">
                    {a.action} · {relativeTime(a.occurredAt, locale)}
                  </li>
                ))}
                {!detail.recentActivity.length ? (
                  <li className="text-[var(--admin-muted)]">
                    {isFa
                      ? "رویداد محصولی ثبت نشده"
                      : "No product events recorded"}
                  </li>
                ) : null}
              </ul>
            </section>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Notes
              </h3>
              <ul className="mt-1 space-y-2 text-xs">
                {detail.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-[var(--admin-border)] px-2 py-1.5"
                  >
                    {n.body}
                    <span className="mt-1 block text-[var(--admin-muted)]">
                      {relativeTime(n.createdAt, locale)}
                    </span>
                  </li>
                ))}
                {detail.notesUnavailableReason ? (
                  <li
                    role="status"
                    className="rounded-lg border border-dashed border-[var(--admin-border)] px-2 py-1.5 text-[var(--admin-muted)]"
                  >
                    {detail.notesUnavailableReason}
                  </li>
                ) : !detail.notes.length ? (
                  <li className="text-[var(--admin-muted)]">—</li>
                ) : null}
              </ul>
            </section>
          </div>
        ) : focused ? (
          <p className="text-xs text-[var(--admin-muted)]">
            {focused.email} · {focused.plan ?? "no plan"}
          </p>
        ) : null}
      </AdminDrawer>
    </div>
  );
}
