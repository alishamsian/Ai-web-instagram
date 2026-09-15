"use client";

import { useTransition } from "react";
import { resolveAdminErrorGroup } from "@/lib/admin/phase5-actions";
import type { Locale } from "@/lib/config/env";

export function ErrorGroupActions({
  groupId,
  locale,
  canManage,
}: {
  groupId: string;
  locale: Locale;
  canManage: boolean;
}) {
  const isFa = locale === "fa";
  const [pending, startTransition] = useTransition();
  if (!canManage) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await resolveAdminErrorGroup({ groupId });
        });
      }}
      className="rounded-md border border-[var(--admin-border)] px-2 py-1 text-[11px] text-[var(--admin-muted)] hover:text-[var(--admin-fg)] disabled:opacity-50"
    >
      {pending ? "…" : isFa ? "حل‌شده" : "Resolve"}
    </button>
  );
}
