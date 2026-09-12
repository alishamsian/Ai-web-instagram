"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelIcon } from "@/components/channels/ChannelCard";
import {
  adaptContentForChannel,
  suggestChannelsForContent,
} from "@/lib/publishing/adapt";
import type {
  AdaptedContent,
  ChannelType,
  ContentItem,
  PublicationResult,
  PublishingChannel,
} from "@/types/publishing";
import { CHANNEL_META } from "@/types/publishing";
import { cn } from "@/lib/utils";

function MediaPreview({
  content,
  className,
}: {
  content: ContentItem;
  className?: string;
}) {
  const media = content.media[0];
  if (!media) {
    return (
      <div
        className={cn(
          "flex aspect-[4/5] items-center justify-center bg-[#ecece9] text-xs text-muted-foreground",
          className,
        )}
      >
        No media
      </div>
    );
  }
  if (media.type === "video") {
    return (
      <div className={cn("relative aspect-[4/5] overflow-hidden bg-[#111]", className)}>
        <video
          src={media.url}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      </div>
    );
  }
  return (
    <div className={cn("relative aspect-[4/5] overflow-hidden bg-[#ecece9]", className)}>
      <Image
        src={media.url}
        alt={media.alt || content.title || ""}
        fill
        className="object-cover"
        sizes="(max-width:768px) 100vw, 320px"
        unoptimized
      />
    </div>
  );
}

export function ContentCard({
  content,
  locale,
  onRepurpose,
}: {
  content: ContentItem;
  locale: "fa" | "en";
  onRepurpose: (content: ContentItem) => void;
}) {
  const isFa = locale === "fa";
  const when = new Date(content.createdAt);
  const timeLabel = Number.isNaN(when.getTime())
    ? ""
    : when.toLocaleDateString(isFa ? "fa-IR" : "en-US", {
        month: "short",
        day: "numeric",
      });

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-white transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
      <MediaPreview content={content} />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ChannelIcon type="instagram" className="size-3.5" />
          <span>Instagram</span>
          <span className="text-border">·</span>
          <span>{content.type === "reel" ? "Reel" : "Post"}</span>
          {timeLabel ? (
            <>
              <span className="text-border">·</span>
              <span>{timeLabel}</span>
            </>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold tracking-tight text-ink">
          {content.title || (isFa ? "بدون عنوان" : "Untitled")}
        </h3>
        {content.caption ? (
          <p className="line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {content.caption}
          </p>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => onRepurpose(content)}
        >
          <Sparkles className="size-3.5" aria-hidden />
          {isFa ? "بازنشر هوشمند" : "Repurpose"}
        </Button>
      </div>
    </article>
  );
}

export function RepurposeFlow({
  content,
  channels,
  locale,
  siteUrl,
  workspaceId,
  onClose,
}: {
  content: ContentItem;
  channels: PublishingChannel[];
  locale: "fa" | "en";
  siteUrl?: string;
  workspaceId?: string;
  onClose: () => void;
}) {
  const isFa = locale === "fa";
  const suggested = suggestChannelsForContent(content);
  const publishable = channels.filter(
    (c) => c.type !== "whatsapp" && c.status !== "coming_soon",
  );
  const [selected, setSelected] = useState<Set<ChannelType>>(
    () =>
      new Set(
        suggested.filter((t) =>
          publishable.some((c) => c.type === t && c.status === "connected"),
        ),
      ),
  );
  const [step, setStep] = useState<"select" | "review" | "status">("select");
  const [activeTab, setActiveTab] = useState<ChannelType>("website");
  const [results, setResults] = useState<PublicationResult[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [scheduleAt, setScheduleAt] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");

  const adaptations = useMemo(() => {
    return [...selected].map((type) =>
      adaptContentForChannel(content, type, siteUrl),
    );
  }, [content, selected, siteUrl]);

  const selectedChannels = publishable.filter((c) => selected.has(c.type));

  function toggle(type: ChannelType) {
    if (type === "whatsapp") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function goReview() {
    const first = [...selected][0] ?? "website";
    setActiveTab(first);
    setStep("review");
  }

  function publish(when: "now" | "schedule" = mode) {
    startTransition(async () => {
      setStep("status");
      setResults(null);
      try {
        const res = await fetch("/api/publishing/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content,
            channels: selectedChannels,
            adaptations,
            scheduleAt:
              when === "schedule" && scheduleAt
                ? new Date(scheduleAt).toISOString()
                : undefined,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          results?: PublicationResult[];
          error?: string;
        } | null;
        if (!res.ok || !data?.results) {
          setResults(
            selectedChannels.map((c) => ({
              ok: false,
              publication: {
                id: c.id,
                contentId: content.id,
                channelId: c.id,
                channelType: c.type,
                status: "failed" as const,
                error:
                  data?.error ||
                  (isFa ? "انتشار ناموفق بود." : "Publish request failed."),
              },
            })),
          );
          return;
        }
        setResults(data.results);
        if (workspaceId && data.results) {
          const { appendPublishResults } = await import(
            "@/lib/publishing/queue-client"
          );
          appendPublishResults({
            workspaceId,
            contentId: content.id,
            contentTitle: content.title || content.caption?.slice(0, 48) || "Content",
            results: data.results,
            channelNames: Object.fromEntries(
              selectedChannels.map((c) => [
                c.type,
                isFa
                  ? CHANNEL_META[c.type].labelFa
                  : CHANNEL_META[c.type].labelEn,
              ]),
            ),
          });
        }
      } catch {
        setResults(
          selectedChannels.map((c) => ({
            ok: false,
            publication: {
              id: c.id,
              contentId: content.id,
              channelId: c.id,
              channelType: c.type,
              status: "failed" as const,
              error: isFa ? "خطای شبکه." : "Network error.",
            },
          })),
        );
      }
    });
  }

  const adaptedForTab: AdaptedContent | undefined = adaptations.find(
    (a) => a.channelType === activeTab,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        aria-label={isFa ? "بستن" : "Close"}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-s border-border bg-white shadow-[0_0_80px_rgba(0,0,0,0.18)]">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {step === "select"
                ? isFa
                  ? "بازنشر"
                  : "Repurpose"
                : step === "review"
                  ? isFa
                    ? "بازبینی"
                    : "Review"
                  : isFa
                    ? "انتشار"
                    : "Publishing"}
            </p>
            <h2 className="mt-1 font-display text-xl tracking-tight text-ink">
              {content.title || (isFa ? "محتوای جدید" : "New content")}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-ink"
            onClick={onClose}
            aria-label={isFa ? "بستن" : "Close"}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {step === "select" ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl bg-[#f6f6f4] ring-1 ring-border/70">
                <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[112px_1fr]">
                  <MediaPreview content={content} className="rounded-xl aspect-[4/5] sm:aspect-square" />
                  <div className="min-w-0 py-1">
                    <p className="text-[11px] text-muted-foreground">
                      {isFa ? "محتوای تشخیص‌داده‌شده" : "New content detected"}
                    </p>
                    <p className="mt-1 line-clamp-4 text-[13px] leading-5 text-ink">
                      {content.caption || content.title}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="size-3.5 text-ink" aria-hidden />
                  <p className="text-sm font-semibold text-ink">
                    {isFa
                      ? "AI این محتوا را برای هر کانال تطبیق می‌دهد"
                      : "AI adapts this content for each channel"}
                  </p>
                </div>
                <ul className="space-y-2">
                  {(["website", "telegram", "instagram", "whatsapp"] as ChannelType[]).map(
                    (type) => {
                      const meta = CHANNEL_META[type];
                      const channel = channels.find((c) => c.type === type);
                      const soon = type === "whatsapp";
                      const connected = channel?.status === "connected";
                      const checked = selected.has(type);
                      return (
                        <li key={type}>
                          <button
                            type="button"
                            disabled={soon || !connected}
                            onClick={() => toggle(type)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-start transition-colors",
                              checked
                                ? "border-ink bg-ink/[0.03]"
                                : "border-border bg-white hover:border-ink/25",
                              (soon || !connected) && "opacity-55",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                                checked
                                  ? "border-ink bg-ink text-white"
                                  : "border-border",
                              )}
                            >
                              {checked ? <Check className="size-3" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <ChannelIcon type={type} className="size-3.5" />
                                <span className="text-sm font-semibold text-ink">
                                  {isFa ? meta.labelFa : meta.labelEn}
                                </span>
                                {soon ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    {isFa ? "قفل · به‌زودی" : "Locked · Coming soon"}
                                  </span>
                                ) : !connected ? (
                                  <span className="text-[10px] text-amber-800">
                                    {isFa ? "وصل نیست" : "Not connected"}
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                                {isFa ? meta.descriptionFa : meta.descriptionEn}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    },
                  )}
                </ul>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-4">
              <div className="flex gap-1 overflow-x-auto rounded-full bg-[#f4f4f2] p-1">
                {[...selected].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveTab(type)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                      activeTab === type
                        ? "bg-ink text-white"
                        : "text-muted-foreground hover:text-ink",
                    )}
                  >
                    {isFa
                      ? CHANNEL_META[type].labelFa
                      : CHANNEL_META[type].labelEn}
                  </button>
                ))}
              </div>

              {/* Channel-native preview */}
              <div
                className={cn(
                  "overflow-hidden rounded-2xl border border-border",
                  activeTab === "telegram" && "bg-[#e8f1f8]",
                  activeTab === "instagram" && "bg-[#111]",
                  activeTab === "website" && "bg-white",
                )}
              >
                {activeTab === "telegram" ? (
                  <div className="space-y-2 p-4">
                    <p className="text-[11px] font-medium text-[#2AABEE]">
                      Telegram preview
                    </p>
                    <div className="max-w-[92%] rounded-2xl rounded-es-md bg-white px-3.5 py-3 shadow-sm">
                      {adaptedForTab?.title ? (
                        <p className="text-sm font-semibold text-ink">
                          {adaptedForTab.title}
                        </p>
                      ) : null}
                      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-ink/90">
                        {adaptedForTab?.caption}
                      </p>
                    </div>
                  </div>
                ) : activeTab === "instagram" ? (
                  <div className="p-3">
                    <MediaPreview
                      content={content}
                      className="aspect-[4/5] rounded-xl"
                    />
                    <p className="mt-3 line-clamp-4 px-1 text-[13px] leading-5 text-white/90">
                      <span className="font-semibold">
                        {isFa ? "تو" : "you"}{" "}
                      </span>
                      {adaptedForTab?.caption}
                    </p>
                  </div>
                ) : (
                  <div>
                    <MediaPreview content={content} className="aspect-[16/10]" />
                    <div className="space-y-2 p-4">
                      {adaptedForTab?.title ? (
                        <p className="text-base font-semibold text-ink">
                          {adaptedForTab.title}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-[14px] leading-6 text-ink/90">
                        {adaptedForTab?.caption}
                      </p>
                      {adaptedForTab?.ctaUrl ? (
                        <p className="text-[12px] text-muted-foreground">
                          {adaptedForTab.ctaLabel}: {adaptedForTab.ctaUrl}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {adaptedForTab?.notes ? (
                <p className="text-[11px] text-muted-foreground">
                  {adaptedForTab.notes}
                </p>
              ) : null}

              <div className="rounded-2xl border border-border bg-[#fafafa] p-3.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {isFa ? "زمان انتشار" : "Publish timing"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("now")}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      mode === "now"
                        ? "bg-ink text-white"
                        : "bg-white text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    {isFa ? "الان" : "Now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("schedule")}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      mode === "schedule"
                        ? "bg-ink text-white"
                        : "bg-white text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    {isFa ? "زمان‌بندی" : "Schedule"}
                  </button>
                </div>
                {mode === "schedule" ? (
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="mt-3 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-ink"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {step === "status" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {pending
                  ? isFa
                    ? "در حال انتشار…"
                    : "Publishing…"
                  : isFa
                    ? "نتیجه انتشار"
                    : "Publish results"}
              </p>
              {(results ?? selectedChannels.map((c) => ({
                ok: false,
                publication: {
                  id: c.id,
                  contentId: content.id,
                  channelId: c.id,
                  channelType: c.type,
                  status: "publishing" as const,
                },
              }))).map((r) => (
                <div
                  key={r.publication.channelId + r.publication.channelType}
                  className="flex items-center justify-between rounded-xl border border-border px-3.5 py-3"
                >
                  <span className="inline-flex items-center gap-2 text-sm text-ink">
                    <ChannelIcon type={r.publication.channelType} />
                    {isFa
                      ? CHANNEL_META[r.publication.channelType].labelFa
                      : CHANNEL_META[r.publication.channelType].labelEn}
                  </span>
                  <span className="text-[12px]">
                    {r.publication.status === "publishing" || pending ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : r.ok ? (
                      <span className="text-emerald-700">
                        {selectedChannels.find(
                          (c) => c.id === r.publication.channelId,
                        )?.metadata?.demo
                          ? isFa
                            ? "دمو · شبیه‌سازی"
                            : "Demo · Simulated"
                          : isFa
                            ? "منتشر شد"
                            : "Published"}
                      </span>
                    ) : (
                      <span className="text-amber-800">
                        {r.publication.error?.slice(0, 48) ||
                          (isFa ? "ناموفق" : "Failed")}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="flex gap-2 border-t border-border bg-[#fafafa] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          {step === "select" ? (
            <>
              <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                {isFa ? "بستن" : "Close"}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={selected.size === 0}
                onClick={goReview}
              >
                {isFa ? "بازبینی و انتشار" : "Review & publish"}
                {isFa ? (
                  <ChevronLeft className="size-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden />
                )}
              </Button>
            </>
          ) : null}
          {step === "review" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setStep("select")}
              >
                {isFa ? "بازگشت" : "Back"}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={
                  pending ||
                  selectedChannels.length === 0 ||
                  (mode === "schedule" && !scheduleAt)
                }
                onClick={() => publish(mode)}
              >
                {mode === "schedule"
                  ? isFa
                    ? "زمان‌بندی"
                    : "Schedule"
                  : isFa
                    ? `انتشار در ${selectedChannels.length} کانال`
                    : `Publish to ${selectedChannels.length}`}
              </Button>
            </>
          ) : null}
          {step === "status" ? (
            <div className="flex w-full gap-2">
              {results?.some((r) => !r.ok) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={pending}
                  onClick={() => publish("now")}
                >
                  {isFa ? "تلاش مجدد" : "Retry"}
                </Button>
              ) : null}
              <Button type="button" className="flex-1" onClick={onClose}>
                {isFa ? "تمام" : "Done"}
              </Button>
            </div>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
