"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Images, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SoftBanner,
} from "@/components/dashboard/ui";
import {
  ContentCard,
  RepurposeFlow,
} from "@/components/content/RepurposeFlow";
import type { ContentItem, PublishingChannel } from "@/types/publishing";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "oldest";
type FilterKey = "all" | "post" | "reel";

export function PostsPageClient({
  locale,
  items,
  channels,
  isDemo,
  siteUrl,
  importHref,
  workspaceId,
}: {
  locale: "fa" | "en";
  items: ContentItem[];
  channels: PublishingChannel[];
  isDemo: boolean;
  siteUrl?: string;
  importHref: string;
  workspaceId: string;
}) {
  const isFa = locale === "fa";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [active, setActive] = useState<ContentItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((item) => {
      if (filter !== "all" && item.type !== filter) return false;
      if (!q) return true;
      const hay = `${item.title ?? ""} ${item.caption ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [items, query, filter, sort]);

  return (
    <PageStack>
      <PageHeader
        eyebrow={isFa ? "محتوا" : "Content"}
        title={isFa ? "پست‌ها" : "Posts"}
        description={
          isFa
            ? "محتوا را ببین، بازبینی کن و در کانال‌ها بازنشر کن."
            : "Create, review and repurpose your content across your channels."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/dashboard/channels`}>
                {isFa ? "کانال‌ها" : "Channels"}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={importHref}>
                {isFa ? "ورود از اینستاگرام" : "Import from Instagram"}
              </Link>
            </Button>
          </div>
        }
      />

      {isDemo ? (
        <SoftBanner tone="info">
          {isFa
            ? "نمای دمو LUNA STUDIO — پست‌های واقعی بعد از اتصال اینستاگرام اینجا می‌آیند."
            : "Demo feed for LUNA STUDIO — real posts appear after Instagram import."}
        </SoftBanner>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{isFa ? "جستجو" : "Search"}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isFa ? "جستجو در کپشن…" : "Search captions…"}
            className="h-10 w-full rounded-xl border border-border bg-white pe-3 ps-9 text-sm text-ink outline-none ring-ink/20 placeholder:text-muted-foreground focus:ring-2"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", isFa ? "همه" : "All"],
              ["post", isFa ? "پست" : "Posts"],
              ["reel", isFa ? "ریل" : "Reels"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "bg-ink text-white"
                  : "bg-white text-muted-foreground ring-1 ring-border hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-full border border-border bg-white px-3 text-xs text-ink"
            aria-label={isFa ? "مرتب‌سازی" : "Sort"}
          >
            <option value="newest">{isFa ? "جدیدترین" : "Newest"}</option>
            <option value="oldest">{isFa ? "قدیمی‌ترین" : "Oldest"}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={isFa ? "هنوز محتوایی نیست" : "No content yet"}
          body={
            isFa
              ? "بعد از اتصال اینستاگرام، آخرین پست‌ها اینجا ظاهر می‌شوند."
              : "Once Instagram is connected, your latest content will appear here."
          }
          icon={<Images className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link href={importHref}>
                {isFa ? "ورود اینستاگرام" : "Connect Instagram"}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              locale={locale}
              onRepurpose={setActive}
            />
          ))}
        </div>
      )}

      {active ? (
        <RepurposeFlow
          content={active}
          channels={channels}
          locale={locale}
          siteUrl={siteUrl}
          workspaceId={workspaceId}
          onClose={() => setActive(null)}
        />
      ) : null}
    </PageStack>
  );
}
