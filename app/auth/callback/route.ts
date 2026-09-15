import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginPath, safeAuthNext } from "@/lib/auth/redirect";
import { resolveAdminActor } from "@/lib/admin/rbac";
import { parseLocale } from "@/lib/i18n/paths";

/**
 * OAuth / email-confirm / password-recovery callback.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const localeFromNext = rawNext?.match(/^\/(fa|en)(\/|$)/)?.[1];
  const locale = parseLocale(localeFromNext ?? "fa");
  const next = safeAuthNext(rawNext, locale);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await supabase.auth.getUser();
      const adminActor = data.user
        ? await resolveAdminActor(data.user.id)
        : null;
      const destination = resolvePostLoginPath({
        locale,
        rawNext,
        isAdmin: Boolean(adminActor),
      });
      return NextResponse.redirect(new URL(destination || next, origin));
    }
  }

  return NextResponse.redirect(new URL(`/${locale}/login?error=auth`, origin));
}
