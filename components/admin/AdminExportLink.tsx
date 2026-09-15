"use client";

export function AdminExportLink({
  entity,
  label = "Export CSV",
}: {
  entity: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={async () => {
        const res = await fetch(
          `/api/admin/export?entity=${encodeURIComponent(entity)}`,
        );
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vitrin-admin-${entity}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }}
      className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-[11px] text-[var(--admin-muted)] hover:text-[var(--admin-fg)]"
    >
      {label}
    </button>
  );
}
