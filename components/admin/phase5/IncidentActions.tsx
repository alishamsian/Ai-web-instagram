"use client";

import { useTransition } from "react";
import {
  transitionAdminIncident,
  type IncidentStatus,
} from "@/lib/admin/phase5-actions";
import type { Locale } from "@/lib/config/env";

const TRANSITIONS: { status: IncidentStatus; fa: string; en: string }[] = [
  { status: "acknowledged", fa: "تأیید", en: "Acknowledge" },
  { status: "investigating", fa: "بررسی", en: "Investigate" },
  { status: "resolved", fa: "حل", en: "Resolve" },
  { status: "open", fa: "بازگشایی", en: "Reopen" },
];

export function IncidentActions({
  incidentId,
  currentStatus,
  locale,
  canManage,
}: {
  incidentId: string;
  currentStatus: string;
  locale: Locale;
  canManage: boolean;
}) {
  const isFa = locale === "fa";
  const [pending, startTransition] = useTransition();
  if (!canManage) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {TRANSITIONS.filter((t) => t.status !== currentStatus).map((t) => (
        <button
          key={t.status}
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await transitionAdminIncident({
                incidentId,
                status: t.status,
              });
            });
          }}
          className="rounded-md border border-[var(--admin-border)] px-2 py-1 text-[11px] text-[var(--admin-muted)] hover:text-[var(--admin-fg)] disabled:opacity-50"
        >
          {isFa ? t.fa : t.en}
        </button>
      ))}
    </div>
  );
}
