"use client";

import {
  AtSign,
  Check,
  Globe,
  MessageCircle,
  Radio,
  Send,
} from "lucide-react";
import type { ChannelStatus, ChannelType, PublishingChannel } from "@/types/publishing";
import { CHANNEL_META } from "@/types/publishing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/ui";

export function ChannelIcon({
  type,
  className,
}: {
  type: ChannelType;
  className?: string;
}) {
  const Icon =
    type === "website"
      ? Globe
      : type === "telegram"
        ? Send
        : type === "instagram"
          ? AtSign
          : type === "whatsapp"
            ? MessageCircle
            : Radio;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}

function statusTone(
  status: ChannelStatus,
): "success" | "warning" | "danger" | "neutral" | "accent" {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  if (status === "coming_soon") return "accent";
  return "neutral";
}

function statusLabel(status: ChannelStatus, isFa: boolean) {
  const map = {
    connected: isFa ? "متصل" : "Connected",
    disconnected: isFa ? "قطع" : "Disconnected",
    error: isFa ? "خطا" : "Error",
    coming_soon: isFa ? "به‌زودی" : "Coming soon",
  } as const;
  return map[status];
}

function relativeTime(iso: string | undefined, isFa: boolean) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return isFa ? "همین الان" : "Just now";
  if (mins < 60)
    return isFa ? `${mins} دقیقه پیش` : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48)
    return isFa ? `${hours} ساعت پیش` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return isFa ? `${days} روز پیش` : `${days}d ago`;
}

export function ChannelCard({
  channel,
  locale,
  onManage,
  demo,
}: {
  channel: PublishingChannel;
  locale: "fa" | "en";
  onManage?: (channel: PublishingChannel) => void;
  demo?: boolean;
}) {
  const isFa = locale === "fa";
  const meta = CHANNEL_META[channel.type];
  const name = isFa ? meta.labelFa : meta.labelEn;
  const coming = channel.status === "coming_soon";
  const activity = relativeTime(channel.lastActivityAt, isFa);

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-white p-5 transition-[transform,border-color,box-shadow] duration-200",
        "hover:-translate-y-px hover:border-ink/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]",
        coming && "opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl ring-1 ring-border/80",
              coming ? "bg-[#f6f6f4] text-muted-foreground" : "bg-ink text-white",
            )}
          >
            <ChannelIcon type={channel.type} className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-ink">
                {name}
              </h3>
              <StatusBadge tone={statusTone(channel.status)}>
                {statusLabel(channel.status, isFa)}
              </StatusBadge>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {channel.identifier ||
                (coming
                  ? isFa
                    ? meta.descriptionFa
                    : meta.descriptionEn
                  : isFa
                    ? "هنوز شناسه‌ای نیست"
                    : "No identifier yet")}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-muted-foreground">
        {coming
          ? isFa
            ? "محتوا را مستقیم به واتساپ بیزنس ببر — به‌زودی."
            : "Bring content to WhatsApp Business — soon."
          : activity
            ? isFa
              ? `آخرین فعالیت ${activity}`
              : `Last activity ${activity}`
            : isFa
              ? "هنوز فعالیتی ثبت نشده"
              : "No activity yet"}
        {demo ? (
          <span className="ms-2 rounded-full bg-[#f4f4f2] px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Demo
          </span>
        ) : null}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-5">
        {coming ? (
          <Button type="button" size="sm" variant="outline" disabled>
            {isFa ? "به‌زودی" : "Coming soon"}
          </Button>
        ) : channel.status === "disconnected" || channel.status === "error" ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="sm"
              className="min-h-10"
              onClick={() => onManage?.(channel)}
            >
              {channel.status === "error"
                ? isFa
                  ? "اتصال مجدد"
                  : "Reconnect now"
                : isFa
                  ? "اتصال دوباره"
                  : "Reconnect"}
            </Button>
            {channel.type === "telegram" ? (
              <p className="text-[11px] leading-4 text-muted-foreground">
                {isFa
                  ? "چت‌آیدی را در تنظیمات اعلان فعال کن."
                  : "Enable chat ID in notification settings."}
              </p>
            ) : channel.type === "instagram" ? (
              <p className="text-[11px] leading-4 text-muted-foreground">
                {isFa
                  ? "از ورود اینستاگرام دوباره همگام کن."
                  : "Re-sync from Instagram import."}
              </p>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onManage?.(channel)}
          >
            {isFa ? "مدیریت" : "Manage"}
          </Button>
        )}
        {channel.status === "error" ? (
          <span className="ms-auto text-[11px] text-amber-800">
            {isFa ? "اتصال منقضی شده" : "Connection expired"}
          </span>
        ) : channel.status === "connected" ? (
          <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-emerald-700">
            <Check className="size-3" aria-hidden />
            {isFa ? "آماده انتشار" : "Ready"}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function ChannelCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border border-border bg-white p-5"
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-[#ecece9]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-24 rounded bg-[#ecece9]" />
          <div className="h-3 w-32 rounded bg-[#f0f0ed]" />
        </div>
      </div>
      <div className="mt-4 h-3 w-40 rounded bg-[#f0f0ed]" />
      <div className="mt-5 h-8 w-24 rounded-lg bg-[#ecece9]" />
    </div>
  );
}
