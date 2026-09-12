"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/ui";
import { formatRelativeTime } from "@/lib/dashboard/format";
import {
  NOTIF_READ_KEY,
  PUBLISH_QUEUE_KEY,
  type ActivityItem,
  type QueueEntry,
} from "@/lib/dashboard/ops";
import { cn } from "@/lib/utils";

export function NotificationCenter({
  locale,
  workspaceId,
  serverItems,
}: {
  locale: "fa" | "en";
  workspaceId: string;
  serverItems: ActivityItem[];
}) {
  const isFa = locale === "fa";
  const [open, setOpen] = useState(false);
  const [readAt, setReadAt] = useState<number>(0);
  const [queueFails, setQueueFails] = useState<ActivityItem[]>([]);
  const [inbox, setInbox] = useState<ActivityItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${NOTIF_READ_KEY}:${workspaceId}`);
      setReadAt(raw ? Number(raw) || 0 : 0);
      const queueRaw = localStorage.getItem(`${PUBLISH_QUEUE_KEY}:${workspaceId}`);
      const queue = queueRaw ? (JSON.parse(queueRaw) as QueueEntry[]) : [];
      setQueueFails(
        queue
          .filter((q) => q.status === "failed")
          .slice(0, 5)
          .map((q) => ({
            id: `q-${q.id}`,
            tone: "danger" as const,
            title: isFa ? "انتشار ناموفق" : "Publish failed",
            detail: `${q.channelName}: ${q.contentTitle}`,
            at: q.at,
            href: "dashboard/content/queue",
          })),
      );
    } catch {
      /* ignore */
    }
  }, [workspaceId, isFa, open]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/notifications/inbox", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: Array<{
            id: string;
            title: string;
            body?: string;
            href?: string;
            tone: ActivityItem["tone"];
            createdAt: string;
          }>;
        };
        if (cancelled || !data.items) return;
        setInbox(
          data.items.map((item) => ({
            id: `inbox-${item.id}`,
            tone: item.tone,
            title: item.title,
            detail: item.body || "",
            at: item.createdAt,
            href: item.href || "dashboard",
          })),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, open]);

  const items = useMemo(() => {
    return [...inbox, ...serverItems, ...queueFails]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);
  }, [inbox, serverItems, queueFails]);

  const unread = items.filter((i) => new Date(i.at).getTime() > readAt).length;

  function markRead() {
    const now = Date.now();
    setReadAt(now);
    try {
      localStorage.setItem(`${NOTIF_READ_KEY}:${workspaceId}`, String(now));
    } catch {
      /* ignore */
    }
    void fetch("/api/notifications/inbox", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) markRead();
            return next;
          });
        }}
        className="relative inline-flex size-9 items-center justify-center rounded-[10px] border border-border bg-white text-muted-foreground transition-colors hover:border-ink/25 hover:text-ink"
        aria-label={isFa ? "اعلان‌ها" : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -end-1 -top-1 min-w-4 rounded-full bg-ink px-1 text-[9px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label={isFa ? "بستن" : "Close"}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={isFa ? "اعلان‌ها" : "Notifications"}
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 max-h-[min(70vh,28rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_rgba(0,0,0,0.14)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:end-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(100vw-2rem,22rem)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {isFa ? "اعلان‌ها" : "Notifications"}
              </p>
              <Link
                href={`/${locale}/dashboard/content/queue`}
                className="text-[11px] text-muted-foreground hover:text-ink"
                onClick={() => setOpen(false)}
              >
                {isFa ? "صف انتشار" : "Queue"}
              </Link>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {isFa ? "اعلان تازه‌ای نیست" : "No new notifications"}
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${locale}/${item.href}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-4 py-3 transition-colors hover:bg-[#f6f6f4]",
                        new Date(item.at).getTime() > readAt && "bg-ink/[0.02]",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-ink">
                          {item.title}
                        </p>
                        <StatusBadge tone={item.tone === "accent" ? "accent" : item.tone}>
                          {formatRelativeTime(item.at, locale)}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-muted-foreground">
                        {item.detail}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
