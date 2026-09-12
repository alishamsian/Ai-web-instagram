"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SoftBanner,
  StatusBadge,
} from "@/components/dashboard/ui";
import type { QueueEntry } from "@/lib/dashboard/ops";
import { ChannelIcon } from "@/components/channels/ChannelCard";
import { CHANNEL_META, type ChannelType } from "@/types/publishing";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + (7 - x.getDay()));
  x.setHours(23, 59, 59, 999);
  return x;
}

export function ContentCalendarClient({
  locale,
  workspaceId,
}: {
  locale: "fa" | "en";
  workspaceId: string;
}) {
  const isFa = locale === "fa";
  const [entries, setEntries] = useState<QueueEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { loadPublishQueue } = await import("@/lib/publishing/queue-client");
      const result = await loadPublishQueue(workspaceId);
      if (!cancelled) setEntries(result.entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const buckets = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const todayEnd = todayStart + 86_400_000 - 1;
    const weekEnd = endOfWeek(now).getTime();

    const today: QueueEntry[] = [];
    const week: QueueEntry[] = [];
    const scheduled: QueueEntry[] = [];
    const earlier: QueueEntry[] = [];

    for (const e of entries) {
      const t = new Date(e.scheduledAt || e.at).getTime();
      if (e.status === "scheduled" && t > now.getTime()) {
        scheduled.push(e);
      } else if (t >= todayStart && t <= todayEnd) {
        today.push(e);
      } else if (t > todayEnd && t <= weekEnd) {
        week.push(e);
      } else if (t < todayStart) {
        earlier.push(e);
      } else {
        week.push(e);
      }
    }
    return { today, week, scheduled, earlier: earlier.slice(0, 12) };
  }, [entries]);

  function Section({
    title,
    items,
  }: {
    title: string;
    items: QueueEntry[];
  }) {
    if (items.length === 0) return null;
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {items.map((entry) => {
            const type = entry.channelType as ChannelType;
            const meta = CHANNEL_META[type];
            const when = new Date(entry.scheduledAt || entry.at);
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <ChannelIcon
                    type={type}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {entry.contentTitle}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {meta
                        ? isFa
                          ? meta.labelFa
                          : meta.labelEn
                        : entry.channelName}
                      <span className="mx-1.5 text-border">·</span>
                      {when.toLocaleString(isFa ? "fa-IR" : "en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  tone={
                    entry.status === "published"
                      ? "success"
                      : entry.status === "scheduled"
                        ? "accent"
                        : "danger"
                  }
                  className="self-start sm:self-auto"
                >
                  {entry.status}
                </StatusBadge>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const empty =
    buckets.today.length +
      buckets.week.length +
      buckets.scheduled.length +
      buckets.earlier.length ===
    0;

  return (
    <PageStack>
      <PageHeader
        eyebrow={isFa ? "محتوا" : "Content"}
        title={isFa ? "تقویم انتشار" : "Publish calendar"}
        description={
          isFa
            ? "امروز، این هفته و موارد زمان‌بندی‌شده — ساده و خوانا."
            : "Today, this week, and scheduled items — simple and scannable."
        }
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/content/queue`}>
              {isFa ? "صف انتشار" : "Queue"}
            </Link>
          </Button>
        }
      />

      <SoftBanner tone="info">
        {isFa
          ? "زمان‌بندی‌ها از صف ابری خوانده می‌شوند — در بازنشر می‌توانی «زمان‌بندی» بگذاری."
          : "Schedules come from the cloud queue — pick Schedule in Repurpose to add one."}
      </SoftBanner>

      {empty ? (
        <EmptyState
          title={isFa ? "هنوز زمانی ثبت نشده" : "Nothing scheduled yet"}
          body={
            isFa
              ? "با بازنشر پست‌ها، امروز و این هفته اینجا پر می‌شود."
              : "Repurpose posts and today / this week will fill in here."
          }
          icon={<CalendarDays className="size-5" aria-hidden />}
          steps={[
            {
              label: isFa ? "پست‌ها را باز کن" : "Open Posts",
              href: `/${locale}/dashboard/content/posts`,
            },
            { label: isFa ? "کانال‌ها را انتخاب کن" : "Choose channels" },
            { label: isFa ? "انتشار یا زمان‌بندی" : "Publish or schedule" },
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
        <div className="space-y-6">
          <Section title={isFa ? "امروز" : "Today"} items={buckets.today} />
          <Section title={isFa ? "این هفته" : "This week"} items={buckets.week} />
          <Section
            title={isFa ? "زمان‌بندی‌شده" : "Scheduled"}
            items={buckets.scheduled}
          />
          <Section title={isFa ? "اخیر" : "Earlier"} items={buckets.earlier} />
        </div>
      )}
    </PageStack>
  );
}
