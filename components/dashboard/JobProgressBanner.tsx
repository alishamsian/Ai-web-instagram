"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SoftBanner, StatusBadge } from "@/components/dashboard/ui";
import type { ImportJob } from "@/types/jobs";
import { importStaleMs } from "@/lib/config/import";

export function JobProgressBanner({
  job,
  locale,
}: {
  job: ImportJob;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [live, setLive] = useState(job);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const finished = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const stale =
    nowMs - new Date(live.updatedAt || live.createdAt).getTime() >
    importStaleMs(live.postsLimit);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      if (finished.current) return;
      const res = await fetch(`/api/import/${job.id}`);
      if (!active || !res.ok) return;
      const next = (await res.json()) as ImportJob;
      setLive(next);
      if (next.status === "completed" || next.status === "failed") {
        finished.current = true;
        router.refresh();
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [job.id, router]);

  const stages = [
    "connecting",
    "profile_found",
    "reading_content",
    "posts_imported",
    "understanding_brand",
    "creating_website",
    "ready",
  ];
  const idx = Math.max(0, stages.indexOf(live.stage));
  const pct = Math.round(((idx + 1) / stages.length) * 100);
  const failed = live.status === "failed" || stale;

  return (
    <div
      className={
        failed
          ? "overflow-hidden rounded-2xl border border-red-200/80 bg-red-50 px-4 py-4 text-red-950"
          : "overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/40 px-4 py-4 text-amber-950 shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {failed
              ? isFa
                ? "ساخت سایت متوقف شد"
                : "Build stalled"
              : isFa
                ? "در حال ساخت سایت…"
                : "Building your site…"}
          </p>
          <p className="mt-1 text-xs opacity-80">
            @{live.username ?? "…"} · {live.stage.replaceAll("_", " ")}
          </p>
        </div>
        <StatusBadge tone={failed ? "danger" : "warning"}>
          {failed ? (isFa ? "گیر کرده" : "Stuck") : `${pct}%`}
        </StatusBadge>
      </div>
      {!failed ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-200/80">
          <div
            className="h-full rounded-full bg-amber-600 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <SoftBanner tone="warning" className="border-red-200/60 bg-white/70 text-red-900">
            {isFa
              ? "مدت‌ها پیشرفتی ثبت نشد. دوباره تلاش کن یا تعداد پست کمتری انتخاب کن."
              : "No progress for a long time. Retry, or choose fewer posts."}
          </SoftBanner>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link
                href={`/${locale}/create?url=${encodeURIComponent(live.sourceUrl || "instagram.com/demo")}&posts=${live.postsLimit ?? 6}&refresh=1`}
              >
                {isFa ? "تلاش دوباره" : "Try again"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/create?url=instagram.com/demo&posts=6`}>
                {isFa ? "دمو" : "Demo"}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
