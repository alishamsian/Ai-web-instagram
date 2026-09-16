/**
 * Admin Foundation — RBAC permissions (deny-by-default).
 * Roles: OWNER > SUPER_ADMIN > OPERATIONS > SUPPORT > ANALYST
 */

export const ADMIN_ROLES = [
  "OWNER",
  "SUPER_ADMIN",
  "OPERATIONS",
  "SUPPORT",
  "ANALYST",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "users.read",
  "users.write",
  "users.suspend",
  "workspaces.read",
  "workspaces.write",
  "websites.read",
  "websites.write",
  "websites.publish",
  "websites.restore",
  "billing.read",
  "billing.write",
  "billing.manage",
  "billing.override",
  "billing.refund",
  "revenue.read",
  "growth.read",
  "orders.read",
  "orders.write",
  "imports.read",
  "imports.retry",
  "jobs.read",
  "jobs.retry",
  "jobs.cancel",
  "ai.read",
  "ai.manage",
  "system.read",
  "system.manage",
  "database.read",
  "database.write",
  "audit.read",
  "feature_flags.read",
  "feature_flags.write",
  "experiments.read",
  "experiments.write",
  "support.read",
  "support.write",
  "settings.read",
  "settings.write",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ALL = ADMIN_PERMISSIONS;

/** Explicit grants per role. Missing permission = denied. */
export const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  OWNER: ALL,
  SUPER_ADMIN: ALL.filter((p) => p !== "database.write"),
  OPERATIONS: [
    "users.read",
    "workspaces.read",
    "workspaces.write",
    "websites.read",
    "websites.write",
    "websites.publish",
    "websites.restore",
    "billing.read",
    "revenue.read",
    "growth.read",
    "orders.read",
    "orders.write",
    "imports.read",
    "imports.retry",
    "jobs.read",
    "jobs.retry",
    "jobs.cancel",
    "ai.read",
    "system.read",
    "audit.read",
    "support.read",
    "support.write",
    "settings.read",
  ],
  SUPPORT: [
    "users.read",
    "workspaces.read",
    "websites.read",
    "websites.restore",
    "orders.read",
    "imports.read",
    "imports.retry",
    "jobs.read",
    "jobs.retry",
    "ai.read",
    "audit.read",
    "support.read",
    "support.write",
  ],
  ANALYST: [
    "users.read",
    "workspaces.read",
    "websites.read",
    "orders.read",
    "imports.read",
    "jobs.read",
    "ai.read",
    "billing.read",
    "revenue.read",
    "growth.read",
    "system.read",
    "audit.read",
    "feature_flags.read",
    "experiments.read",
  ],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

export function isAdminPermission(value: unknown): value is AdminPermission {
  return (
    typeof value === "string" &&
    (ADMIN_PERMISSIONS as readonly string[]).includes(value)
  );
}

/** Deny-by-default permission check. */
export function roleHasPermission(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role) return false;
  const grants = ROLE_PERMISSIONS[role];
  return grants.includes(permission);
}

export function permissionsForRole(role: AdminRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role];
}

/** Destructive actions that must never be implicit. */
export const DESTRUCTIVE_PERMISSIONS = [
  "users.suspend",
  "billing.refund",
  "billing.override",
  "billing.manage",
  "jobs.cancel",
  "database.write",
  "websites.restore",
  "feature_flags.write",
  "settings.write",
] as const satisfies readonly AdminPermission[];

export function isDestructivePermission(permission: AdminPermission): boolean {
  return (DESTRUCTIVE_PERMISSIONS as readonly string[]).includes(permission);
}
