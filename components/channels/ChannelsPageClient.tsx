"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SoftBanner,
} from "@/components/dashboard/ui";
import { ChannelCard } from "@/components/channels/ChannelCard";
import {
  ConnectChannelButton,
  ConnectChannelDialog,
} from "@/components/channels/ConnectChannelDialog";
import type { ChannelType, PublishingChannel } from "@/types/publishing";
import { Radio } from "lucide-react";

export function ChannelsPageClient({
  locale,
  channels,
  isDemo,
  websiteManageHref,
  importHref,
  settingsHref,
}: {
  locale: "fa" | "en";
  channels: PublishingChannel[];
  isDemo: boolean;
  websiteManageHref: string;
  importHref: string;
  settingsHref: string;
}) {
  const isFa = locale === "fa";
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");

  const connected = channels.filter((c) => c.status === "connected").length;
  const coming = channels.filter((c) => c.status === "coming_soon").length;
  const destinations = connected;

  function onSelect(type: ChannelType) {
    if (type === "whatsapp") return;
    if (type === "website") {
      window.location.href = websiteManageHref;
      return;
    }
    if (type === "instagram") {
      window.location.href = importHref;
      return;
    }
    if (type === "telegram") {
      window.location.href = settingsHref;
      setToast(
        isFa
          ? "تلگرام را از تنظیمات اعلان / چت‌آیدی وصل کن."
          : "Connect Telegram via Settings (chat ID / bot).",
      );
      return;
    }
  }

  function onManage(channel: PublishingChannel) {
    if (channel.type === "website") {
      window.location.href = websiteManageHref;
      return;
    }
    if (channel.type === "instagram") {
      window.location.href = importHref;
      return;
    }
    if (channel.type === "telegram") {
      window.location.href = settingsHref;
      return;
    }
  }

  const metrics = useMemo(
    () => [
      {
        label: isFa ? "متصل" : "Connected",
        value: connected,
      },
      {
        label: isFa ? "مقصد انتشار" : "Destinations",
        value: destinations,
      },
      {
        label: isFa ? "به‌زودی" : "Coming soon",
        value: coming,
      },
    ],
    [connected, destinations, coming, isFa],
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow={isFa ? "محتوا" : "Content"}
        title={isFa ? "کانال‌ها" : "Channels"}
        description={
          isFa
            ? "کانال‌ها را وصل کن و مشخص کن محتوا کجا برود."
            : "Connect your channels and manage where your content goes."
        }
        actions={
          <ConnectChannelButton locale={locale} onOpen={() => setOpen(true)} />
        }
      />

      {isDemo ? (
        <SoftBanner tone="info">
          {isFa
            ? "نمای دمو با برند فرضی LUNA STUDIO — وقتی ایمپورت واقعی داشته باشی، کانال‌های واقعی جایگزین می‌شوند."
            : "Demo preview with fictional LUNA STUDIO — real imports replace this with your channels."}
        </SoftBanner>
      ) : null}

      {channels.some((c) => c.type === "telegram" && c.status === "disconnected") &&
      !isDemo ? (
        <SoftBanner tone="warning">
          {isFa
            ? "تلگرام وصل نیست — از تنظیمات اعلان، چت‌آیدی را فعال کن یا از مدیریت کانال دوباره وصل شو."
            : "Telegram is disconnected — enable chat ID in notification settings, or reconnect from Manage."}
        </SoftBanner>
      ) : null}

      <div className="grid grid-cols-2 gap-3 border-b border-border/80 pb-4 sm:flex sm:flex-wrap sm:gap-6">
        {metrics.map((m) => (
          <div key={m.label} className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {m.label}
            </p>
            <p className="mt-1 font-display text-xl tabular-nums tracking-tight text-ink sm:text-2xl">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      {channels.length === 0 ? (
        <EmptyState
          title={isFa ? "هنوز کانالی نیست" : "No channels yet"}
          body={
            isFa
              ? "یک کانال وصل کن تا محتوا فراتر از اینستاگرام منتشر شود."
              : "Connect a channel to start publishing beyond Instagram."
          }
          icon={<Radio className="size-5" aria-hidden />}
          steps={[
            {
              label: isFa ? "اتصال کانال" : "Connect a channel",
            },
            {
              label: isFa ? "از پست‌ها بازنشر کن" : "Repurpose from Posts",
              href: `/${locale}/dashboard/content/posts`,
            },
            {
              label: isFa ? "نتیجه را در صف ببین" : "Review the queue",
              href: `/${locale}/dashboard/content/queue`,
            },
          ]}
          action={
            <Button type="button" onClick={() => setOpen(true)}>
              {isFa ? "اتصال کانال" : "Connect a channel"}
            </Button>
          }
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">
              {isFa ? "کانال‌های تو" : "Your channels"}
            </h2>
            <Link
              href={`/${locale}/dashboard/content/posts`}
              className="text-[12px] font-medium text-muted-foreground hover:text-ink"
            >
              {isFa ? "رفتن به پست‌ها" : "Go to Posts"}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                locale={locale}
                demo={isDemo || Boolean(channel.metadata?.demo)}
                onManage={onManage}
              />
            ))}
          </div>
        </section>
      )}

      {toast ? (
        <p className="text-xs text-muted-foreground" role="status">
          {toast}
        </p>
      ) : null}

      <ConnectChannelDialog
        locale={locale}
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
      />
    </PageStack>
  );
}
