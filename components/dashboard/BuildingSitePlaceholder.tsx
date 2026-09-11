import Link from "next/link";
import type { ImportJob } from "@/types/jobs";
import { JobProgressBanner } from "@/components/dashboard/JobProgressBanner";

/** Shown while an import job is running and the site isn't ready yet. */
export function BuildingSitePlaceholder({
  job,
  locale,
}: {
  job: ImportJob;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative flex min-h-[200px] items-end bg-[radial-gradient(circle_at_30%_20%,#ececec,transparent_55%),linear-gradient(135deg,#f7f7f5,#ebebeb)] p-5 sm:min-h-[240px] lg:min-h-[300px]">
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-x-8 top-10 h-40 animate-pulse rounded-2xl bg-white/50" />
            <div className="absolute inset-x-16 top-24 h-24 animate-pulse rounded-xl bg-white/40 [animation-delay:200ms]" />
          </div>
          <div className="relative">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {isFa ? "در حال ساخت" : "Building"}
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-ink md:text-3xl">
              @{job.username ?? "…"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFa
                ? "به‌زودی کارت سایت اینجا می‌آید."
                : "Your site card will appear here shortly."}
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4 p-5 md:p-6">
          <JobProgressBanner job={job} locale={locale} />
          <ButtonishCreate locale={locale} />
        </div>
      </div>
    </article>
  );
}

function ButtonishCreate({ locale }: { locale: "fa" | "en" }) {
  const isFa = locale === "fa";
  return (
    <p className="text-xs text-muted-foreground">
      {isFa ? "یا " : "Or "}
      <Link
        href={`/${locale}/create`}
        className="font-medium text-ink underline-offset-2 hover:underline"
      >
        {isFa ? "شروع دوباره" : "start over"}
      </Link>
    </p>
  );
}
