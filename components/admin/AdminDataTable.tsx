// Shared (no directive): safe to render from Server Components *and* Client
// Components. Column definitions contain functions, which cannot cross the
// RSC boundary — so this layer evaluates `cell`/`sortValue` wherever it runs
// and hands only serializable data (rendered ReactNodes + primitives) to the
// client-side table that owns search / sort / pagination state.
import type { ReactNode } from "react";
import {
  AdminDataTableClient,
  type PreparedColumn,
  type PreparedRow,
} from "@/components/admin/AdminDataTableClient";

export type AdminColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

export function prepareAdminTable<T extends { id: string }>(
  rows: T[],
  columns: AdminColumn<T>[],
): { rows: PreparedRow[]; columns: PreparedColumn[] } {
  const preparedColumns: PreparedColumn[] = columns.map((c) => ({
    id: c.id,
    header: c.header,
    sortable: Boolean(c.sortValue),
    className: c.className,
  }));

  const preparedRows: PreparedRow[] = rows.map((row) => {
    const cells: Record<string, ReactNode> = {};
    const sortValues: Record<string, string | number> = {};
    for (const col of columns) {
      cells[col.id] = col.cell(row);
      if (col.sortValue) sortValues[col.id] = col.sortValue(row);
    }
    let searchText: string;
    try {
      searchText = JSON.stringify(row).toLowerCase();
    } catch {
      searchText = row.id.toLowerCase();
    }
    return { id: row.id, cells, sortValues, searchText };
  });

  return { rows: preparedRows, columns: preparedColumns };
}

export function AdminDataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder,
  emptyTitle,
  emptyBody,
  pageSize = 20,
  locale,
  onRowClick,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  searchPlaceholder: string;
  emptyTitle: string;
  emptyBody?: string;
  pageSize?: number;
  locale: "fa" | "en";
  /** Only usable when the caller is itself a Client Component. */
  onRowClick?: (row: T) => void;
}) {
  const prepared = prepareAdminTable(rows, columns);
  const byId = onRowClick ? new Map(rows.map((r) => [r.id, r])) : null;

  return (
    <AdminDataTableClient
      rows={prepared.rows}
      columns={prepared.columns}
      searchPlaceholder={searchPlaceholder}
      emptyTitle={emptyTitle}
      emptyBody={emptyBody}
      pageSize={pageSize}
      locale={locale}
      onRowClick={
        onRowClick && byId
          ? (id) => {
              const row = byId.get(id);
              if (row) onRowClick(row);
            }
          : undefined
      }
    />
  );
}
