"use client";

import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import type { ActivityItem } from "@/lib/dashboard/ops";

export function DashboardHeaderTools({
  locale,
  workspaceId,
  websiteId,
  notifications,
}: {
  locale: "fa" | "en";
  workspaceId: string;
  websiteId?: string | null;
  notifications: ActivityItem[];
}) {
  return (
    <>
      <CommandPalette locale={locale} websiteId={websiteId} />
      <NotificationCenter
        locale={locale}
        workspaceId={workspaceId}
        serverItems={notifications}
      />
    </>
  );
}
