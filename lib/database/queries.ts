import { isSupabaseConfigured } from "@/lib/config/env";
import {
  isSupabaseSchemaReady,
  mapWebsiteRow,
  mapDomainRow,
  type WebsiteRow,
  type DomainRow,
} from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { readStore } from "@/lib/database/store";
import { isSoftDeleted } from "@/lib/admin/soft-delete";
import type { DomainRecord, WebsiteRecord } from "@/types/website";

export async function getWebsiteById(
  id: string,
): Promise<WebsiteRecord | null> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("websites")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;
    return mapWebsiteRow(data as WebsiteRow);
  }
  const store = await readStore();
  const site = store.websites.find((w) => w.id === id);
  if (!site || isSoftDeleted(site)) return null;
  return site;
}

export async function getWebsiteForWorkspace(
  id: string,
  workspaceId: string,
): Promise<WebsiteRecord | null> {
  const site = await getWebsiteById(id);
  if (!site || site.workspaceId !== workspaceId) return null;
  return site;
}

export async function getPublishedWebsiteBySlug(
  slug: string,
): Promise<WebsiteRecord | null> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("websites")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;
    return mapWebsiteRow(data as WebsiteRow);
  }
  const store = await readStore();
  return (
    store.websites.find(
      (w) =>
        w.slug === slug && w.status === "published" && !isSoftDeleted(w),
    ) ?? null
  );
}

export async function getDomainsForWebsite(
  websiteId: string,
): Promise<DomainRecord[]> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("domains")
      .select("*")
      .eq("website_id", websiteId);
    if (error || !data) return [];
    return data.map((row) => mapDomainRow(row as DomainRow));
  }
  const store = await readStore();
  return (store.domains ?? []).filter((d) => d.websiteId === websiteId);
}

export type WebsiteVersionSummary = {
  id: string;
  version: number;
  createdAt: string;
  brandName?: string;
  template?: string;
  productCount?: number;
  seoTitle?: string;
};

function summarizeVersionConfig(config: unknown): Pick<
  WebsiteVersionSummary,
  "brandName" | "template" | "productCount" | "seoTitle"
> {
  const c = config as {
    brand?: { name?: string };
    template?: string;
    content?: { products?: { items?: unknown[] } };
    seo?: { title?: string };
  } | null;
  if (!c) return {};
  return {
    brandName: c.brand?.name,
    template: c.template,
    productCount: c.content?.products?.items?.length ?? 0,
    seoTitle: c.seo?.title,
  };
}

/** Lightweight version list with snapshot fields for diffs. */
export async function getWebsiteVersionSummaries(
  websiteId: string,
  workspaceId: string,
  limit = 5,
): Promise<WebsiteVersionSummary[]> {
  const site = await getWebsiteForWorkspace(websiteId, workspaceId);
  if (!site) return [];

  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("website_versions")
      .select("id, version, created_at, config")
      .eq("website_id", websiteId)
      .order("version", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id as string,
      version: row.version as number,
      createdAt: row.created_at as string,
      ...summarizeVersionConfig(row.config),
    }));
  }

  const store = await readStore();
  return store.versions
    .filter((item) => item.websiteId === websiteId)
    .sort((a, b) => b.version - a.version)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      version: item.version,
      createdAt: item.createdAt,
      ...summarizeVersionConfig(item.config),
    }));
}

export async function getPublishedSlugByCustomHost(
  host: string,
): Promise<string | null> {
  const normalized = host.split(":")[0].toLowerCase();
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("domains")
      .select("host, website_id, websites!inner(slug, status, deleted_at)")
      .eq("host", normalized)
      .maybeSingle();
    if (error || !data) return null;
    const website = data.websites as unknown as {
      slug: string;
      status: string;
      deleted_at?: string | null;
    };
    if (website.status !== "published" || website.deleted_at) return null;
    return website.slug;
  }
  const store = await readStore();
  const domain = (store.domains ?? []).find((d) => d.host === normalized);
  if (!domain) return null;
  const site = store.websites.find(
    (w) =>
      w.id === domain.websiteId &&
      w.status === "published" &&
      !isSoftDeleted(w),
  );
  return site?.slug ?? null;
}

export async function countWebsitesForWorkspace(workspaceId: string) {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { count, error } = await db
      .from("websites")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    if (error) return 0;
    return count ?? 0;
  }
  const store = await readStore();
  return store.websites.filter(
    (w) => w.workspaceId === workspaceId && !isSoftDeleted(w),
  ).length;
}

export async function listPublishedWebsiteSlugs(): Promise<
  { slug: string; updatedAt: string }[]
> {
  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("websites")
      .select("slug, updated_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error || !data) return [];
    return data.map((row) => ({
      slug: row.slug as string,
      updatedAt: row.updated_at as string,
    }));
  }
  const store = await readStore();
  return store.websites
    .filter((w) => w.status === "published" && !isSoftDeleted(w))
    .map((w) => ({ slug: w.slug, updatedAt: w.updatedAt }));
}
