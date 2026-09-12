"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SoftBanner,
  StatusBadge,
} from "@/components/dashboard/ui";
import { formatRelativeTime } from "@/lib/dashboard/format";
import { CHANNEL_META } from "@/types/publishing";
import type { QueueEntry } from "@/lib/dashboard/ops";
import {
  cancelScheduled,
  loadPublishQueue,
  writePublishQueue,
} from "@/lib/publishing/queue-client";
import { ChannelIcon } from "@/components/channels/ChannelCard";
import type { ChannelType } from "@/types/publishing";

export function PublishQueueClient({
  locale,
  workspaceId,
}: {
  locale: "fa" | "en";
  workspaceId: string;
}) {
  const isFa = locale === "fa";
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [source, setSource] = useState<"db" | "local">("local");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await loadPublishQueue(workspaceId);
      if (cancelled) return;
      setEntries(result.entries);
      setSource(result.source);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const failed = useMemo(
    () => entries.filter((e) => e.status === "failed"),
    [entries],
  );

  function clearFailed() {
    const next = entries.filter((e) => e.status !== "failed");
    writePublishQueue(workspaceId, next);
    setEntries(next);
  }

  async function onCancel(id: string) {
    const ok = await cancelScheduled(id);
    if (!ok) return;
    const next = entries.map((e) =>
      e.id === id
        ? { ...e, status: "failed" as const, error: isFa ? "لغو شد" : "Cancelled" }
        : e,
    );
    writePublishQueue(workspaceId, next);
    setEntries(next);
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow={isFa ? "محتوا" : "Content"}
        title={isFa ? "صف انتشار" : "Publish queue"}
        description={
          isFa
            ? "نتیجه انتشار در کانال‌ها — موفق، ناموفق و زمان‌بندی‌شده."
            : "Outcomes across channels — published, failed, and scheduled."
        }
        actions={
          failed.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={clearFailed}>
              {isFa ? "پاک‌کردن ناموفق‌ها" : "Clear failed"}
            </Button>
          ) : null
        }
      />

      <SoftBanner tone="info">
        {source === "db"
          ? isFa
            ? "صف روی فضای کاری همگام است — بین دستگاه‌ها یکی می‌ماند."
            : "Queue is synced to your workspace across devices."
          : isFa
            ? "نمایش از حافظهٔ محلی — بعد از اعمال migration، همگام ابری فعال می‌شود."
            : "Showing local cache — cloud sync activates after migrations are applied."}
      </SoftBanner>

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {isFa ? "در حال بارگذاری…" : "Loading…"}
        </p>
      ) : entries.length === 0 ? (
        <EmptyState
          title={isFa ? "صف خالی است" : "Queue is empty"}
          body={
            isFa
              ? "بعد از بازنشر از پست‌ها، وضعیت هر کانال اینجا می‌آید."
              : "After you repurpose from Posts, each channel outcome appears here."
          }
          icon={<ListTodo className="size-5" aria-hidden />}
          steps={[
            {
              label: isFa ? "رفتن به پست‌ها" : "Go to Posts",
              href: `/${locale}/dashboard/content/posts`,
            },
            {
              label: isFa ? "بازنشر روی کانال‌ها" : "Repurpose to channels",
            },
            {
              label: isFa ? "نتیجه را اینجا ببین" : "Review outcomes here",
            },
          ]}
          action={
            <Button asChild>
              <Link href={`/${locale}/dashboard/content/posts`}>
                {isFa ? "پست‌ها" : "Posts"}
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {entries.map((entry) => {
            const type = entry.channelType as ChannelType;
            const meta = CHANNEL_META[type];
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
              >
                <ChannelIcon type={type} className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {entry.contentTitle}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {meta
                      ? isFa
                        ? meta.labelFa
                        : meta.labelEn
                      : entry.channelName}
                    <span className="mx-1.5 text-border">·</span>
                    {entry.scheduledAt
                      ? new Date(entry.scheduledAt).toLocaleString(
                          isFa ? "fa-IR" : "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : formatRelativeTime(entry.at, locale)}
                  </p>
                  {entry.error ? (
                    <p className="mt-1 text-[11px] text-amber-800">{entry.error}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    tone={
                      entry.status === "published"
                        ? "success"
                        : entry.status === "scheduled"
                          ? "accent"
                          : "danger"
                    }
                  >
                    {entry.status === "published"
                      ? isFa
                        ? "منتشر شد"
                        : "Published"
                      : entry.status === "scheduled"
                        ? isFa
                          ? "زمان‌بندی"
                          : "Scheduled"
                        : isFa
                          ? "ناموفق"
                          : "Failed"}
                  </StatusBadge>
                  {entry.status === "scheduled" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void onCancel(entry.id)}
                    >
                      {isFa ? "لغو" : "Cancel"}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageStack>
  );
}
