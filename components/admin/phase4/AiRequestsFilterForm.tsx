import type { DateRangePreset } from "@/lib/admin/dates";
import { AdminCard } from "@/components/admin/primitives";
import type { Locale } from "@/lib/config/env";

const RANGE_OPTIONS: { id: DateRangePreset; label: { fa: string; en: string } }[] = [
  { id: "today", label: { fa: "امروز", en: "Today" } },
  { id: "7d", label: { fa: "۷ روز", en: "7d" } },
  { id: "30d", label: { fa: "۳۰ روز", en: "30d" } },
  { id: "90d", label: { fa: "۹۰ روز", en: "90d" } },
];

export function AiRequestsFilterForm({
  locale,
  values,
}: {
  locale: Locale;
  values: {
    range: string;
    provider: string;
    model: string;
    feature: string;
    status: string;
    q: string;
    page: string;
  };
}) {
  const isFa = locale === "fa";

  return (
    <AdminCard>
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">
            {isFa ? "بازه" : "Range"}
          </span>
          <select
            name="range"
            defaultValue={values.range}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {isFa ? o.label.fa : o.label.en}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">Provider</span>
          <input
            name="provider"
            defaultValue={values.provider}
            placeholder="openai…"
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">Model</span>
          <input
            name="model"
            defaultValue={values.model}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">Feature</span>
          <input
            name="feature"
            defaultValue={values.feature}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="text-[var(--admin-muted)]">Status</span>
          <select
            name="status"
            defaultValue={values.status}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          >
            <option value="">{isFa ? "همه" : "All"}</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
            <option value="started">started</option>
          </select>
        </label>
        <label className="block text-xs sm:col-span-2">
          <span className="text-[var(--admin-muted)]">
            {isFa ? "جستجو" : "Search"}
          </span>
          <input
            name="q"
            defaultValue={values.q}
            placeholder={isFa ? "feature، model…" : "feature, model…"}
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2.5 py-1.5 text-sm"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-[var(--admin-fg)] px-3 py-1.5 text-xs font-medium text-[var(--admin-bg)]"
          >
            {isFa ? "اعمال" : "Apply"}
          </button>
        </div>
      </form>
    </AdminCard>
  );
}
