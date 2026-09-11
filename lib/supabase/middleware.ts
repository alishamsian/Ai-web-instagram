import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabasePublicConfigured } from "@/lib/config/env";

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.includes("-auth-token") ||
        (cookie.name.startsWith("sb-") && Boolean(cookie.value)),
    );
}

/**
 * Refresh Supabase Auth cookies on authenticated app requests.
 * Skips public storefronts and requests with no auth cookies to avoid
 * Auth API rate limits that freeze the app.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  if (!isSupabasePublicConfigured()) {
    return response;
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/s/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/orders") ||
    pathname.startsWith("/api/health") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return response;
  }

  if (!hasSupabaseAuthCookie(request)) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    // Do not run code between createServerClient and getClaims().
    await supabase.auth.getClaims();
  } catch {
    // Rate limits / network blips must not block page rendering.
  }

  return response;
}
