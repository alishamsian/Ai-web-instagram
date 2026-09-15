import "server-only";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  AdminAuthError,
  requireAdminPermission,
  resolveAdminActor,
  type AdminActor,
} from "@/lib/admin/rbac";
import type { AdminPermission } from "@/lib/admin/permissions";
import { parseLocale } from "@/lib/i18n/paths";

/**
 * Gate an Admin page: session + active admin profile + required permission.
 * Never trusts client-provided role.
 */
export async function requireAdminPage(
  localeRaw: string,
  permission: AdminPermission = "system.read",
): Promise<{ actor: AdminActor; locale: "fa" | "en"; userId: string }> {
  const locale = parseLocale(localeRaw);
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/admin/dashboard`);
  }

  try {
    const actor = await requireAdminPermission(session.user.id, permission);
    return { actor, locale, userId: session.user.id };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      if (error.code === "UNAUTHORIZED") {
        redirect(`/${locale}/login?next=/${locale}/admin/dashboard`);
      }
      redirect(`/${locale}/dashboard`);
    }
    // Transient infra failures during permission lookup must not blank Admin.
    console.error("[admin:gate]", error instanceof Error ? error.message : "unknown");
    redirect(`/${locale}/dashboard`);
  }
}

/** Soft check for layout chrome (non-throwing). */
export async function getAdminPageActor(): Promise<AdminActor | null> {
  const session = await getSession();
  if (!session) return null;
  return resolveAdminActor(session.user.id);
}
