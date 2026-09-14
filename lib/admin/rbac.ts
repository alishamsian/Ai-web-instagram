import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import {
  isAdminRole,
  roleHasPermission,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin/permissions";

export type AdminActor = {
  userId: string;
  role: AdminRole;
  email?: string | null;
};

export class AdminAuthError extends Error {
  readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "INACTIVE";
  constructor(code: AdminAuthError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "AdminAuthError";
  }
}

/** In-memory override for tests / local without Supabase. */
const memoryAdmins = new Map<string, { role: AdminRole; isActive: boolean }>();

export function __resetAdminMemoryForTests() {
  memoryAdmins.clear();
}

export function __setAdminMemoryForTests(
  userId: string,
  role: AdminRole,
  isActive = true,
) {
  memoryAdmins.set(userId, { role, isActive });
}

export async function getAdminProfile(
  userId: string,
): Promise<{ role: AdminRole; isActive: boolean } | null> {
  const mem = memoryAdmins.get(userId);
  if (mem) return mem;

  if (!supabaseConfigured()) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_profiles")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (!isAdminRole(data.role)) return null;
  return { role: data.role, isActive: Boolean(data.is_active) };
}

export async function resolveAdminActor(
  userId: string | null | undefined,
): Promise<AdminActor | null> {
  if (!userId) return null;
  const profile = await getAdminProfile(userId);
  if (!profile || !profile.isActive) return null;
  return { userId, role: profile.role };
}

/**
 * Server-side gate for privileged admin operations.
 * Deny-by-default: missing role or missing permission → throw.
 */
export async function requireAdminPermission(
  userId: string | null | undefined,
  permission: AdminPermission,
): Promise<AdminActor> {
  if (!userId) {
    throw new AdminAuthError("UNAUTHORIZED", "Admin authentication required.");
  }
  const profile = await getAdminProfile(userId);
  if (!profile) {
    throw new AdminAuthError("FORBIDDEN", "Not an admin.");
  }
  if (!profile.isActive) {
    throw new AdminAuthError("INACTIVE", "Admin account is inactive.");
  }
  if (!roleHasPermission(profile.role, permission)) {
    throw new AdminAuthError(
      "FORBIDDEN",
      `Missing permission: ${permission}`,
    );
  }
  return { userId, role: profile.role };
}

export function assertAdminPermission(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): void {
  if (!roleHasPermission(role, permission)) {
    throw new AdminAuthError(
      "FORBIDDEN",
      `Missing permission: ${permission}`,
    );
  }
}
