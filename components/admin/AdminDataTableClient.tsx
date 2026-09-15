"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AdminEmptyState } from "@/components/admin/primitives";

/**
 * Serializable column metadata — no functions cross the RSC boundary.
 */
export type PreparedColumn = {
  id: string;
  header: string;
  sortable: boolean;
  className?: string;
};

/**
 * A row whose cells were already rendered (ReactNode is RSC-serializable)
 * and whose sort keys / search text were precomputed by the caller.
 */
export type PreparedRow = {
  id: string;
  cells: Record<string, ReactNode>;
  sortValues: Record<string, string | number>;
  searchText: string;
};

export function AdminDataTableClient({
  rows,
  columns,
  searchPlaceholder,
  emptyTitle,
  emptyBody,
  pageSize = 20,
  locale,
  onRowClick,
}: {
  rows: PreparedRow[];
  columns: PreparedColumn[];
  searchPlaceholder: string;
  emptyTitle: string;
  emptyBody?: string;
  pageSize?: number;
  locale: "fa" | "en";
  /** Only available when rendered from a client component. */
  onRowClick?: (rowId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sortId, setSortId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((row) => row.searchText.includes(q));
    }
    if (sortId) {
      const col = columns.find((c) => c.id === sortId);
      if (col?.sortable) {
        list = [...list].sort((a, b) => {
          const av = a.sortValues[sortId] ?? "";
          const bv = b.sortValues[sortId] ?? "";
          if (av < bv) return sortDir === "asc" ? -1 : 1;
          if (av > bv) return sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }
    return list;
  }, [rows, query, sortId, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  if (!rows.length) {
    return <AdminEmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--admin-border)] px-3 py-2.5">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 min-w-[180px] flex-1 rounded-lg border border-[var(--admin-border)] bg-transparent px-3 text-sm outline-none focus:ring-1 focus:ring-[var(--admin-fg)]/30"
        />
        <button
          type="button"
          onClick={() =>
            setDensity((d) =>
              d === "comfortable" ? "compact" : "comfortable",
            )
          }
          className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-[11px] text-[var(--admin-muted)]"
        >
          {density === "comfortable"
            ? locale === "fa"
              ? "فشرده"
              : "Compact"
            : locale === "fa"
              ? "عادی"
              : "Comfortable"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-[11px] uppercase tracking-wide text-[var(--admin-muted)]">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={
                    sortId === col.id
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "px-3 py-2.5 font-medium",
                    density === "compact" && "py-1.5",
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="hover:text-[var(--admin-fg)]"
                      onClick={() => {
                        if (sortId === col.id) {
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        } else {
                          setSortId(col.id);
                          setSortDir("desc");
                        }
                      }}
                    >
                      {col.header}
                      {sortId === col.id ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.id) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row.id);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "border-b border-[var(--admin-border)]/70 last:border-0 hover:bg-[var(--admin-muted-bg)]/60",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "px-3 py-2.5 text-[var(--admin-fg)]",
                      density === "compact" && "py-1.5 text-xs",
                      col.className,
                    )}
                  >
                    {row.cells[col.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--admin-border)] px-3 py-2 text-[11px] text-[var(--admin-muted)]">
        <span>
          {filtered.length} {locale === "fa" ? "ردیف" : "rows"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-[var(--admin-border)] px-2 py-1 disabled:opacity-40"
          >
            {locale === "fa" ? "قبلی" : "Prev"}
          </button>
          <span>
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded border border-[var(--admin-border)] px-2 py-1 disabled:opacity-40"
          >
            {locale === "fa" ? "بعدی" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
