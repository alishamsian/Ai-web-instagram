export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-[#e8e8e4]" />
        <div className="h-8 w-48 rounded-lg bg-[#e4e4e0]" />
        <div className="h-4 w-72 max-w-full rounded bg-[#ecece9]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-2xl border border-border bg-white p-5"
          >
            <div className="h-3 w-24 rounded bg-[#ecece9]" />
            <div className="mt-4 h-8 w-16 rounded bg-[#e8e8e4]" />
            <div className="mt-6 h-3 w-40 rounded bg-[#f0f0ed]" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-border bg-white" />
    </div>
  );
}
