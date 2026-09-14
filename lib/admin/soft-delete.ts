/**
 * Soft-delete / recovery primitives for high-value entities.
 */

export type SoftDeleteMeta = {
  deletedAt: string;
  deletedBy: string | null;
  deletionReason: string | null;
};

export function createSoftDeleteMeta(params: {
  deletedBy?: string | null;
  reason?: string | null;
  at?: Date;
}): SoftDeleteMeta {
  return {
    deletedAt: (params.at ?? new Date()).toISOString(),
    deletedBy: params.deletedBy ?? null,
    deletionReason: params.reason ?? null,
  };
}

export function softDeleteColumns(meta: SoftDeleteMeta) {
  return {
    deleted_at: meta.deletedAt,
    deleted_by: meta.deletedBy,
    deletion_reason: meta.deletionReason,
  };
}

export function restoreSoftDeleteColumns() {
  return {
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
  };
}

export function isSoftDeleted(row: {
  deleted_at?: string | null;
  deletedAt?: string | null;
}): boolean {
  return Boolean(row.deleted_at ?? row.deletedAt);
}

/** Entities where soft-delete has meaningful recovery value. */
export const SOFT_DELETE_ENTITIES = ["websites", "workspaces"] as const;
export type SoftDeleteEntity = (typeof SOFT_DELETE_ENTITIES)[number];
