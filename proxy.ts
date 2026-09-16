import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOCALES } from "@/lib/config/env";
import { getRootHostname } from "@/lib/config/runtime";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.[^/]+$/;

function subdomainSlug(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase();
  const root = getRootHostname().toLowerCase();
  if (!root || host === root || host === `www.${root}`) return null;

  if (host.endsWith(`.${root}`)) {
    const slug = host.slice(0, -(root.length + 1));
    if (slug && !slug.includes(".") && /^[a-z0-9-]+$/.test(slug)) {
      return slug;
    }
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (slug && !slug.includes(".") && /^[a-z0-9-]+$/.test(slug)) {
      return slug;
    }
  }

  return null;
}

function isApexOrLocal(host: string) {
  const root = getRootHostname().toLowerCase();
  if (!root) return host === "localhost" || host.endsWith(".localhost");
  return (
    host === root ||
    host === `www.${root}` ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(`.${root}`)
  );
}

/** Edge-safe custom domain → published slug lookup via PostgREST. */
async function customDomainSlug(hostHeader: string | null): Promise<string | null> {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase();
  if (isApexOrLocal(host)) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Server/edge only — never use a publishable key that cannot read domains under RLS.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;

  try {
    const endpoint = new URL(`${url}/rest/v1/domains`);
    endpoint.searchParams.set("host", `eq.${host}`);
    endpoint.searchParams.set("verified_at", "not.is.null");
    endpoint.searchParams.set("select", "websites!inner(slug,status)");
    endpoint.searchParams.set("websites.status", "eq.published");
    endpoint.searchParams.set("limit", "1");

    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      // Domain map changes rarely; short cache is fine on the edge.
      next: { revalidate: 30 },
    } as RequestInit);

    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{
      websites?: { slug?: string; status?: string } | { slug?: string; status?: string }[];
    }>;
    const row = rows[0];
    if (!row?.websites) return null;
    const website = Array.isArray(row.websites) ? row.websites[0] : row.websites;
    return website?.slug && website.status === "published" ? website.slug : null;
  } catch {
    return null;
  }
}

function rewriteToSite(request: NextRequest, slug: string) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  if (pathname === "/" || pathname === "") {
    url.pathname = `/s/${slug}`;
  } else if (!pathname.startsWith("/s/")) {
    url.pathname = `/s/${slug}${pathname}`;
  }
  return updateSession(request, NextResponse.rewrite(url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const sub = subdomainSlug(host);

  if (sub && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    return rewriteToSite(request, sub);
  }

  // Custom domain (not root / subdomain of ROOT_DOMAIN)
  if (
    host &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !PUBLIC_FILE.test(pathname)
  ) {
    const custom = await customDomainSlug(host);
    if (custom) return rewriteToSite(request, custom);
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/s/") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return updateSession(request, NextResponse.next());
  }

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/fa${pathname === "/" ? "" : pathname}`;
    return updateSession(request, NextResponse.redirect(url));
  }

  const locale = pathname.split("/")[1] ?? "fa";
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-locale", locale);
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
