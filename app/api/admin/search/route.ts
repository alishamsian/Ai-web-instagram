import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { searchAdminEntities } from "@/lib/admin/phase3-queries";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { parseLocale } from "@/lib/i18n/paths";
import { logAdminFailure } from "@/lib/admin/safe";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 120);
  const locale = parseLocale(url.searchParams.get("locale") ?? "fa");

  try {
    // Explicit gate before search — do not trust client role.
    await requireAdminPermission(session.user.id, "users.read");
    const hits = await searchAdminEntities({
      userId: session.user.id,
      locale,
      q,
    });
    return NextResponse.json({ hits });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    logAdminFailure("api.admin.search", error);
    return NextResponse.json({ error: "ERROR" }, { status: 500 });
  }
}
