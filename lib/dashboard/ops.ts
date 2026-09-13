import type { ImportJob } from "@/types/jobs";
import type { InstagramImport } from "@/types/instagram";
import type { PublishingChannel } from "@/types/publishing";
import type { WebsiteRecord } from "@/types/website";
import type { StoreOrderRow } from "@/lib/dashboard/format";
import { sanitizeDisplaySnippet } from "@/lib/dashboard/format";

export type NextAction = {
  id: string;
  priority: number;
  titleFa: string;
  titleEn: string;
  detailFa: string;
  detailEn: string;
  href: string;
  tone: "urgent" | "action" | "insight";
};

export type OnboardingStep = {
  id: "instagram" | "publish" | "channel";
  done: boolean;
  href: string;
  labelFa: string;
  labelEn: string;
  hintFa: string;
  hintEn: string;
};

export type SiteHealthItem = {
  id: string;
  ok: boolean;
  labelFa: string;
  labelEn: string;
  href: string;
};

export type SmartSuggestion = {
  titleFa: string;
  titleEn: string;
  bodyFa: string;
  bodyEn: string;
  href: string;
  ctaFa: string;
  ctaEn: string;
} | null;

export type ActivityItem = {
  id: string;
  tone: "danger" | "warning" | "success" | "neutral" | "accent";
  title: string;
  detail: string;
  at: string;
  href: string;
};

/** Top actionable items for the overview — max 3. */
export function buildNextActions(input: {
  locale: "fa" | "en";
  website: WebsiteRecord | null;
  freshNewOrders: number;
  productsCount: number;
  productsMissingPrice?: number;
  hasImport: boolean;
  channels: PublishingChannel[];
  unpublishedContentHint?: boolean;
  scheduledDueCount?: number;
  failedPublishCount?: number;
}): NextAction[] {
  const actions: NextAction[] = [];
  const siteId = input.website?.id;

  if (input.freshNewOrders > 0) {
    actions.push({
      id: "orders",
      priority: 1,
      titleFa: `${input.freshNewOrders} سفارش جدید`,
      titleEn: `${input.freshNewOrders} new order${input.freshNewOrders > 1 ? "s" : ""}`,
      detailFa: "بررسی و تأیید کن",
      detailEn: "Review and confirm",
      href: "dashboard/orders",
      tone: "urgent",
    });
  }

  if ((input.failedPublishCount ?? 0) > 0) {
    actions.push({
      id: "queue-fail",
      priority: 1.5,
      titleFa: `${input.failedPublishCount} انتشار ناموفق`,
      titleEn: `${input.failedPublishCount} failed publish${(input.failedPublishCount ?? 0) > 1 ? "es" : ""}`,
      detailFa: "صف را باز کن و دوباره تلاش کن",
      detailEn: "Open the queue and retry",
      href: "dashboard/content/queue",
      tone: "urgent",
    });
  }

  if ((input.scheduledDueCount ?? 0) > 0) {
    actions.push({
      id: "schedule-due",
      priority: 1.7,
      titleFa: `${input.scheduledDueCount} پست زمان‌بندی‌شده آماده`,
      titleEn: `${input.scheduledDueCount} scheduled post${(input.scheduledDueCount ?? 0) > 1 ? "s" : ""} due`,
      detailFa: "در صف انتشار بررسی کن",
      detailEn: "Check the publish queue",
      href: "dashboard/content/queue",
      tone: "action",
    });
  }

  if (input.website && input.website.status !== "published") {
    actions.push({
      id: "publish",
      priority: 2,
      titleFa: "سایت هنوز منتشر نشده",
      titleEn: "Site not published yet",
      detailFa: input.website.config.brand.name,
      detailEn: input.website.config.brand.name,
      href: siteId ? `dashboard/website?id=${siteId}` : "dashboard/website",
      tone: "action",
    });
  }

  if (input.website && input.productsCount === 0) {
    actions.push({
      id: "products",
      priority: 3,
      titleFa: "کاتالوگ خالی است",
      titleEn: "Catalog is empty",
      detailFa: "از پست‌ها محصول بساز",
      detailEn: "Turn posts into products",
      href: siteId ? `dashboard/content?id=${siteId}` : "dashboard/content",
      tone: "action",
    });
  } else if (input.website && (input.productsMissingPrice ?? 0) > 0) {
    actions.push({
      id: "prices",
      priority: 3.2,
      titleFa: `${input.productsMissingPrice} محصول بدون قیمت`,
      titleEn: `${input.productsMissingPrice} product${(input.productsMissingPrice ?? 0) > 1 ? "s" : ""} missing price`,
      detailFa: "در استودیو قیمت را کامل کن",
      detailEn: "Finish prices in Content Studio",
      href: siteId
        ? `dashboard/content?id=${siteId}`
        : "dashboard/content",
      tone: "action",
    });
  }

  const telegram = input.channels.find((c) => c.type === "telegram");
  if (telegram && telegram.status === "disconnected") {
    actions.push({
      id: "telegram",
      priority: 4,
      titleFa: "تلگرام وصل نیست",
      titleEn: "Telegram not connected",
      detailFa: "برای بازنشر کانال را وصل کن",
      detailEn: "Connect to start publishing",
      href: "dashboard/channels",
      tone: "action",
    });
  }

  const errored = input.channels.find(
    (c) => c.status === "error" && c.type !== "whatsapp",
  );
  if (errored) {
    actions.push({
      id: "channel-error",
      priority: 3.5,
      titleFa: "کانال نیاز به اتصال مجدد دارد",
      titleEn: "A channel needs reconnect",
      detailFa: errored.name,
      detailEn: errored.name,
      href: "dashboard/channels",
      tone: "urgent",
    });
  }

  if (input.unpublishedContentHint) {
    actions.push({
      id: "repurpose",
      priority: 5,
      titleFa: "پست‌های آماده‌ی بازنشر",
      titleEn: "Posts ready to repurpose",
      detailFa: "محتوا را به کانال‌ها بفرست",
      detailEn: "Send content across channels",
      href: "dashboard/content/posts",
      tone: "insight",
    });
  }

  if (!input.hasImport && !input.website) {
    actions.push({
      id: "import",
      priority: 0,
      titleFa: "شروع با اینستاگرام",
      titleEn: "Start with Instagram",
      detailFa: "پروفایل را وارد کن تا سایت ساخته شود",
      detailEn: "Import a profile to build your site",
      href: "create",
      tone: "action",
    });
  }

  return actions.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

/** Persistent 3-step onboarding: Instagram → Publish → Channel. */
export function buildOnboardingThree(input: {
  hasImport: boolean;
  website: WebsiteRecord | null;
  hasConnectedChannel: boolean;
}): OnboardingStep[] {
  const siteId = input.website?.id;
  return [
    {
      id: "instagram",
      done: input.hasImport || Boolean(input.website),
      href: "create",
      labelFa: "ورود اینستاگرام",
      labelEn: "Connect Instagram",
      hintFa: "پروفایل و پست‌ها را وارد کن",
      hintEn: "Import profile and posts",
    },
    {
      id: "publish",
      done: input.website?.status === "published",
      href: siteId ? `dashboard/website?id=${siteId}` : "dashboard/website",
      labelFa: "انتشار سایت",
      labelEn: "Publish site",
      hintFa: "فروشگاه را زنده کن",
      hintEn: "Make your storefront live",
    },
    {
      id: "channel",
      done: input.hasConnectedChannel,
      href: "dashboard/channels",
      labelFa: "اتصال کانال",
      labelEn: "Connect a channel",
      hintFa: "تلگرام یا وبسایت برای بازنشر",
      hintEn: "Telegram or website for distribution",
    },
  ];
}

export function buildSiteHealth(input: {
  website: WebsiteRecord;
  hasProducts: boolean;
  hasDomain: boolean;
  lastSyncAt?: string | null;
  locale: "fa" | "en";
}): SiteHealthItem[] {
  const id = input.website.id;
  const wa = input.website.config.content.contact?.info?.whatsapp;
  return [
    {
      id: "products",
      ok: input.hasProducts,
      labelFa: "محصولات",
      labelEn: "Products",
      href: `/${input.locale}/dashboard/content?id=${id}`,
    },
    {
      id: "whatsapp",
      ok: Boolean(wa?.trim()),
      labelFa: "واتساپ فروش",
      labelEn: "WhatsApp",
      href: `/${input.locale}/editor/${id}?tab=content`,
    },
    {
      id: "publish",
      ok: input.website.status === "published",
      labelFa: "انتشار",
      labelEn: "Published",
      href: `/${input.locale}/dashboard/website?id=${id}`,
    },
    {
      id: "domain",
      ok: input.hasDomain,
      labelFa: "دامنه",
      labelEn: "Domain",
      href: `/${input.locale}/dashboard/domains?id=${id}`,
    },
    {
      id: "sync",
      ok: Boolean(input.lastSyncAt),
      labelFa: "همگام‌سازی اینستا",
      labelEn: "Instagram sync",
      href: `/${input.locale}/dashboard/import`,
    },
  ];
}

export function buildSmartSuggestion(input: {
  imports: InstagramImport[];
  website: WebsiteRecord | null;
  channels: PublishingChannel[];
}): SmartSuggestion {
  const imp = input.imports[0];
  const post = imp?.posts[0] ?? imp?.reels[0];
  if (!post) return null;

  const caption = (post.caption ?? "").trim();
  const title = sanitizeDisplaySnippet(
    caption.split("\n")[0] ?? caption,
    60,
  );
  const telegramOk = input.channels.some(
    (c) => c.type === "telegram" && c.status === "connected",
  );
  const websiteOk = input.channels.some(
    (c) => c.type === "website" && c.status === "connected",
  );

  if (telegramOk) {
    return {
      titleFa: "پیشنهاد بازنشر",
      titleEn: "Repurpose suggestion",
      bodyFa: `«${title}» برای تلگرام مناسب است.`,
      bodyEn: `“${title}” looks good for Telegram.`,
      href: "dashboard/content/posts",
      ctaFa: "بازنشر",
      ctaEn: "Repurpose",
    };
  }
  if (websiteOk && input.website) {
    return {
      titleFa: "پیشنهاد بازنشر",
      titleEn: "Repurpose suggestion",
      bodyFa: `«${title}» را به بلوک وبسایت تبدیل کن.`,
      bodyEn: `Turn “${title}” into a website block.`,
      href: "dashboard/content/posts",
      ctaFa: "مشاهده پست‌ها",
      ctaEn: "View posts",
    };
  }
  return {
    titleFa: "گام بعدی هوشمند",
    titleEn: "Smart next step",
    bodyFa: "یک کانال وصل کن تا AI محتوا را تطبیق دهد.",
    bodyEn: "Connect a channel so AI can adapt your content.",
    href: "dashboard/channels",
    ctaFa: "کانال‌ها",
    ctaEn: "Channels",
  };
}

export function buildActivityFeed(input: {
  locale: "fa" | "en";
  jobs: ImportJob[];
  websites: WebsiteRecord[];
  primaryWebsite: WebsiteRecord | null;
  freshOrders?: StoreOrderRow[];
  queueFailures?: { id: string; title: string; at: string; href: string }[];
}): ActivityItem[] {
  const isFa = input.locale === "fa";
  const items: ActivityItem[] = [];

  for (const job of input.jobs.slice(0, 10)) {
    if (job.status === "failed") {
      items.push({
        id: `fail-${job.id}`,
        tone: "danger",
        title: isFa ? "ورود ناموفق" : "Import failed",
        detail: `@${job.username ?? "…"} · ${job.errorMessage ?? ""}`.trim(),
        at: job.updatedAt,
        href: "create",
      });
    } else if (job.status === "completed" && job.websiteId) {
      const age = Date.now() - new Date(job.updatedAt).getTime();
      if (age < 72 * 86_400_000) {
        items.push({
          id: `done-${job.id}`,
          tone: "success",
          title: isFa ? "سایت ساخته شد" : "Site ready",
          detail: `@${job.username ?? "…"}`,
          at: job.updatedAt,
          href: `editor/${job.websiteId}`,
        });
      }
    }
  }

  const primary = input.primaryWebsite;
  if (primary) {
    if (primary.status === "published" && primary.publishedAt) {
      const age = Date.now() - new Date(primary.publishedAt).getTime();
      if (age < 7 * 86_400_000) {
        items.push({
          id: `pub-${primary.id}`,
          tone: "success",
          title: isFa ? "سایت منتشر شد" : "Site published",
          detail: primary.config.brand.name,
          at: primary.publishedAt,
          href: `dashboard/website?id=${primary.id}`,
        });
      }
    } else {
      items.push({
        id: `draft-${primary.id}`,
        tone: "warning",
        title: isFa ? "سایت هنوز پیش‌نویس است" : "Site still draft",
        detail: primary.config.brand.name,
        at: primary.updatedAt,
        href: `dashboard/website?id=${primary.id}`,
      });
    }
  }

  const dayAgo = Date.now() - 24 * 86_400_000;
  for (const order of input.freshOrders ?? []) {
    if (order.status !== "new") continue;
    if (new Date(order.createdAt).getTime() < dayAgo) continue;
    const names = order.items.map((i) => i.name).join(isFa ? "، " : ", ");
    items.push({
      id: `order-${order.id}`,
      tone: "accent",
      title: isFa ? "سفارش جدید" : "New order",
      detail: names || order.channel,
      at: order.createdAt,
      href: "dashboard/orders",
    });
  }

  for (const fail of input.queueFailures ?? []) {
    items.push({
      id: fail.id,
      tone: "danger",
      title: isFa ? "انتشار ناموفق" : "Publish failed",
      detail: fail.title,
      at: fail.at,
      href: fail.href,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);
}

export const PUBLISH_QUEUE_KEY = "vitrin:publish-queue";
export const ONBOARDING_DISMISS_KEY = "vitrin:onboarding-dismissed";
export const NOTIF_READ_KEY = "vitrin:notif-read-at";

export type QueueEntry = {
  id: string;
  contentId: string;
  contentTitle: string;
  channelType: string;
  channelName: string;
  status: "published" | "failed" | "scheduled" | "publishing";
  error?: string;
  at: string;
  scheduledAt?: string;
  workspaceId: string;
};
