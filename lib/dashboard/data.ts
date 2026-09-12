import { isSupabaseConfigured } from "@/lib/config/env";
import {
  isSupabaseSchemaReady,
  mapImport,
  mapJob,
  mapWebsiteRow,
  type ImportRow,
  type JobRow,
  type WebsiteRow,
} from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";
import { planLimits } from "@/lib/config/plans";
import type { ImportJob } from "@/types/jobs";
import type { InstagramImport } from "@/types/instagram";
import type { WebsiteRecord } from "@/types/website";

export type WorkspaceDashboardData = {
  websites: WebsiteRecord[];
  imports: InstagramImport[];
  jobs: ImportJob[];
};

export type StoreOrderRow = {
  id: string;
  websiteId: string;
  channel: string;
  status: string;
  customerNote: string | null;
  customerContact: string | null;
  items: { name: string; qty: number; price?: number | null }[];
  createdAt: string;
};

export type DashboardAnalytics = {
  total: number;
  series: { date: string; count: number }[];
  byPath: { path: string; count: number }[];
  byReferrer: { source: string; count: number }[];
};

/** Workspace-scoped dashboard fetch — never loads website_versions. */
export async function getWorkspaceDashboardData(
  workspaceId: string,
): Promise<WorkspaceDashboardData> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const [websitesRes, importsRes, jobsRes] = await Promise.all([
      db
        .from("websites")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false }),
      db
        .from("instagram_imports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false }),
      db
        .from("import_jobs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(40),
    ]);

    return {
      websites: (websitesRes.data ?? []).map((row) =>
        mapWebsiteRow(row as WebsiteRow),
      ),
      imports: (importsRes.data ?? []).map((row) =>
        mapImport(row as ImportRow),
      ),
      jobs: (jobsRes.data ?? []).map((row) => mapJob(row as JobRow)),
    };
  }

  const store = await readStore();
  const websites = store.websites
    .filter((item) => item.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const imports = store.imports
    .filter((item) => item.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const jobs = store.jobs
    .filter((item) => item.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return { websites, imports, jobs };
}

export function getActiveImportJob(jobs: ImportJob[]) {
  return (
    jobs.find((job) =>
      ["queued", "scraping", "processing", "analyzing", "generating"].includes(
        job.status,
      ),
    ) ?? null
  );
}

export async function getWorkspaceOrders(
  workspaceId: string,
  limit = 20,
): Promise<StoreOrderRow[]> {
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) return [];
  const db = getSupabaseAdmin();
  const primary = await db
    .from("store_orders")
    .select(
      "id, website_id, channel, status, items, customer_note, customer_contact, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows =
    primary.error && /customer_contact/i.test(primary.error.message)
      ? (
          await db
            .from("store_orders")
            .select(
              "id, website_id, channel, status, items, customer_note, created_at",
            )
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false })
            .limit(limit)
        ).data
      : primary.error
        ? null
        : primary.data;

  if (!rows) return [];
  return rows.map((row) => ({
    id: row.id as string,
    websiteId: row.website_id as string,
    channel: (row.channel as string) || "manual",
    status: (row.status as string) || "new",
    customerNote: (row.customer_note as string | null) ?? null,
    customerContact:
      ((row as { customer_contact?: string | null }).customer_contact as
        | string
        | null) ?? null,
    items: (row.items as StoreOrderRow["items"]) ?? [],
    createdAt: row.created_at as string,
  }));
}

export async function countWorkspaceOrders(workspaceId: string): Promise<number> {
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) return 0;
  const db = getSupabaseAdmin();
  const { count, error } = await db
    .from("store_orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) return 0;
  return count ?? 0;
}

/** Fresh `new` orders in the last N hours (nav badges / hub health). */
export async function countFreshNewOrders(
  workspaceId: string,
  hours = 24,
): Promise<number> {
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) return 0;
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const db = getSupabaseAdmin();
  const { count, error } = await db
    .from("store_orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "new")
    .gte("created_at", since);
  if (error) return 0;
  return count ?? 0;
}

export async function getLatestWorkspaceOrder(
  workspaceId: string,
): Promise<StoreOrderRow | null> {
  const rows = await getWorkspaceOrders(workspaceId, 1);
  return rows[0] ?? null;
}

export async function getWorkspaceAnalytics(
  websiteIds: string[],
  days = 14,
): Promise<DashboardAnalytics> {
  if (!websiteIds.length) {
    return { total: 0, series: [], byPath: [], byReferrer: [] };
  }
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return { total: 0, series: [], byPath: [], byReferrer: [] };
  }
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("page_views")
    .select("path, created_at, website_id, referrer")
    .in("website_id", websiteIds)
    .gte("created_at", since)
    .limit(20_000);
  const rows = data ?? [];
  const byDay = new Map<string, number>();
  const byPath = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const path = (row.path as string) || "/";
    byPath.set(path, (byPath.get(path) ?? 0) + 1);
    const source = classifyReferrer(row.referrer as string | null);
    byReferrer.set(source, (byReferrer.get(source) ?? 0) + 1);
  }
  return {
    total: rows.length,
    series: [...byDay.entries()].map(([date, count]) => ({ date, count })),
    byPath: [...byPath.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byReferrer: [...byReferrer.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

export function classifyReferrer(referrer: string | null | undefined): string {
  if (!referrer?.trim()) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("instagram")) return "instagram";
    if (host.includes("t.me") || host.includes("telegram")) return "telegram";
    if (host.includes("google")) return "google";
    if (host.includes("twitter") || host.includes("x.com")) return "x";
    if (host.includes("facebook") || host.includes("fb.")) return "facebook";
    return host || "other";
  } catch {
    return "other";
  }
}

/** Per-website visit totals for the last N days. */
export async function getWebsiteVisitCounts(
  websiteIds: string[],
  days = 14,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const id of websiteIds) result.set(id, 0);
  if (!websiteIds.length) return result;
  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) return result;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("page_views")
    .select("website_id")
    .in("website_id", websiteIds)
    .gte("created_at", since)
    .limit(20_000);
  for (const row of data ?? []) {
    const id = row.website_id as string;
    result.set(id, (result.get(id) ?? 0) + 1);
  }
  return result;
}

export type SetupStep = {
  id: string;
  done: boolean;
  href: string;
  labelFa: string;
  labelEn: string;
};

export function buildSetupChecklist(input: {
  locale: "fa" | "en";
  website: WebsiteRecord | null;
  hasImport: boolean;
  hasProducts: boolean;
  visits: number;
}): SetupStep[] {
  const siteId = input.website?.id;
  return [
    {
      id: "import",
      done: input.hasImport || Boolean(input.website),
      href: `create`,
      labelFa: "ورود از اینستاگرام",
      labelEn: "Import from Instagram",
    },
    {
      id: "edit",
      done: Boolean(input.website && input.website.version > 1),
      href: siteId ? `editor/${siteId}` : `create`,
      labelFa: "ویرایش برند و محتوا",
      labelEn: "Edit brand & content",
    },
    {
      id: "products",
      done: input.hasProducts,
      href: siteId ? `dashboard/content?id=${siteId}` : `create`,
      labelFa: "بررسی محصولات",
      labelEn: "Review products",
    },
    {
      id: "publish",
      done: input.website?.status === "published",
      href: siteId ? `dashboard/website?id=${siteId}` : `create`,
      labelFa: "انتشار سایت",
      labelEn: "Publish the site",
    },
    {
      id: "traffic",
      done: input.visits > 0,
      href: `dashboard/analytics`,
      labelFa: "اولین بازدید",
      labelEn: "Get first visit",
    },
  ];
}

/** Site-hub readiness: publish, products, WhatsApp, domain. */
export type SiteReadinessStep = {
  id: string;
  done: boolean;
  href: string;
  labelFa: string;
  labelEn: string;
};

export function buildSiteReadiness(input: {
  website: WebsiteRecord;
  hasProducts: boolean;
  hasDomain: boolean;
  locale: "fa" | "en";
}): SiteReadinessStep[] {
  const id = input.website.id;
  const wa = input.website.config.content.contact?.info?.whatsapp;
  return [
    {
      id: "products",
      done: input.hasProducts,
      href: `/${input.locale}/dashboard/content?id=${id}`,
      labelFa: "حداقل یک محصول",
      labelEn: "At least one product",
    },
    {
      id: "whatsapp",
      done: Boolean(wa?.trim()),
      href: `/${input.locale}/editor/${id}?tab=content`,
      labelFa: "شماره واتساپ فروش",
      labelEn: "WhatsApp for checkout",
    },
    {
      id: "publish",
      done: input.website.status === "published",
      href: `/${input.locale}/dashboard/website?id=${id}`,
      labelFa: "انتشار فروشگاه",
      labelEn: "Publish storefront",
    },
    {
      id: "domain",
      done: input.hasDomain,
      href: `/${input.locale}/dashboard/website?id=${id}&section=domain`,
      labelFa: "دامنه اختصاصی (اختیاری)",
      labelEn: "Custom domain (optional)",
    },
  ];
}

export function versionDiffLabel(
  current: {
    brandName?: string;
    template?: string;
    productCount?: number;
    seoTitle?: string;
  },
  previous: {
    brandName?: string;
    template?: string;
    productCount?: number;
    seoTitle?: string;
  } | null,
  locale: "fa" | "en",
): string | null {
  if (!previous) return null;
  const bits: string[] = [];
  const isFa = locale === "fa";
  if (
    current.brandName &&
    previous.brandName &&
    current.brandName !== previous.brandName
  ) {
    bits.push(isFa ? "برند" : "brand");
  }
  if (
    typeof current.productCount === "number" &&
    typeof previous.productCount === "number" &&
    current.productCount !== previous.productCount
  ) {
    bits.push(
      isFa
        ? `محصول ${previous.productCount}→${current.productCount}`
        : `products ${previous.productCount}→${current.productCount}`,
    );
  }
  if (
    current.template &&
    previous.template &&
    current.template !== previous.template
  ) {
    bits.push(isFa ? "قالب" : "template");
  }
  if (
    current.seoTitle &&
    previous.seoTitle &&
    current.seoTitle !== previous.seoTitle
  ) {
    bits.push("SEO");
  }
  return bits.length ? bits.join(isFa ? " · " : " · ") : null;
}

export function planUsageLabel(
  plan: string | undefined,
  siteCount: number,
  locale: "fa" | "en",
) {
  const limits = planLimits(plan);
  if (locale === "fa") {
    return `${siteCount} از ${limits.maxWebsites} سایت`;
  }
  return `${siteCount} of ${limits.maxWebsites} sites`;
}

export function siteCoverUrl(site: WebsiteRecord): string | null {
  if (site.config.brand.logo) return site.config.brand.logo;
  const heroId = site.config.content.hero.imageId;
  if (heroId && site.config.media[heroId]?.url) {
    return site.config.media[heroId].url;
  }
  const gallery = site.config.content.gallery?.imageIds ?? [];
  for (const id of gallery) {
    if (site.config.media[id]?.url) return site.config.media[id].url;
  }
  const firstMedia = Object.values(site.config.media)[0];
  return firstMedia?.url ?? null;
}

export function formatRelativeTime(iso: string, locale: "fa" | "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60_000));
  if (mins < 1) return locale === "fa" ? "همین الان" : "Just now";
  if (mins < 60) {
    return locale === "fa" ? `${mins} دقیقه پیش` : `${mins}m ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return locale === "fa" ? `${hours} ساعت پیش` : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return locale === "fa" ? `${days} روز پیش` : `${days}d ago`;
}

export function jobStageLabel(
  stage: ImportJob["stage"],
  dict: {
    connecting: string;
    profileFound: string;
    reading: string;
    postsImported: string;
    understanding: string;
    creating: string;
    ready: string;
  },
) {
  switch (stage) {
    case "connecting":
      return dict.connecting;
    case "profile_found":
      return dict.profileFound;
    case "reading_content":
      return dict.reading;
    case "posts_imported":
      return dict.postsImported;
    case "understanding_brand":
      return dict.understanding;
    case "creating_website":
      return dict.creating;
    case "ready":
      return dict.ready;
    default:
      return stage;
  }
}

export function buildNotifications(input: {
  locale: "fa" | "en";
  jobs: ImportJob[];
  websites: WebsiteRecord[];
  /** Primary site only — avoid spamming every draft forever. */
  primaryWebsite: WebsiteRecord | null;
  /** Only fresh `new` orders — not a duplicate of the orders panel dump. */
  freshOrders?: StoreOrderRow[];
}) {
  const items: {
    id: string;
    tone: "danger" | "warning" | "success" | "neutral";
    title: string;
    detail: string;
    at: string;
    href: string;
  }[] = [];
  const isFa = input.locale === "fa";

  for (const job of input.jobs.slice(0, 8)) {
    if (job.status === "failed") {
      items.push({
        id: `fail-${job.id}`,
        tone: "danger",
        title: isFa ? "ورود ناموفق بود" : "Import failed",
        detail: `@${job.username ?? "…"} · ${job.errorMessage ?? ""}`.trim(),
        at: job.updatedAt,
        href: `create`,
      });
    } else if (job.status === "completed" && job.websiteId) {
      const age = Date.now() - new Date(job.updatedAt).getTime();
      if (age < 48 * 86_400_000) {
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
  if (primary && primary.status !== "published") {
    items.push({
      id: `draft-${primary.id}`,
      tone: "warning",
      title: isFa ? "سایت هنوز منتشر نشده" : "Site still draft",
      detail: primary.config.brand.name,
      at: primary.updatedAt,
      href: `dashboard/website?id=${primary.id}`,
    });
  }

  const dayAgo = Date.now() - 24 * 86_400_000;
  for (const order of input.freshOrders ?? []) {
    if (order.status !== "new") continue;
    if (new Date(order.createdAt).getTime() < dayAgo) continue;
    const names = order.items.map((i) => i.name).join(isFa ? "، " : ", ");
    items.push({
      id: `order-${order.id}`,
      tone: "success",
      title: isFa ? "سفارش جدید" : "New order",
      detail: names || order.channel,
      at: order.createdAt,
      href: `dashboard/orders`,
    });
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);
}

/** Short-lived cached reads for overview hot path. */
export async function getCachedOverviewMetrics(
  workspaceId: string,
  websiteIds: string[],
) {
  const { unstable_cache } = await import("next/cache");
  const key = [...websiteIds].sort().join(",") || "none";
  const cached = unstable_cache(
    async () => {
      const [analytics, orderCount, visitCounts, orders] = await Promise.all([
        getWorkspaceAnalytics(websiteIds, 14),
        countWorkspaceOrders(workspaceId),
        getWebsiteVisitCounts(websiteIds, 14),
        getWorkspaceOrders(workspaceId, 5),
      ]);
      return {
        analytics,
        orderCount,
        visitCounts: Object.fromEntries(visitCounts),
        orders,
      };
    },
    [`overview-metrics-${workspaceId}-${key}`],
    { revalidate: 30 },
  );
  const result = await cached();
  return {
    analytics: result.analytics,
    orderCount: result.orderCount,
    visitCounts: new Map(Object.entries(result.visitCounts)),
    orders: result.orders,
  };
}
