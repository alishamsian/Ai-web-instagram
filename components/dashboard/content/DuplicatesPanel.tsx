"use client";

import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/website/SiteImage";
import {
  mediaUrl,
  type DuplicateGroup,
  type StudioProduct,
} from "@/components/dashboard/content/catalog-utils";

export function DuplicatesPanel({
  groups,
  items,
  media,
  locale,
  pending,
  onMerge,
  onSelectGroup,
  onDismiss,
}: {
  groups: DuplicateGroup[];
  items: StudioProduct[];
  media: Record<string, { url: string; type?: string }>;
  locale: "fa" | "en";
  pending: boolean;
  onMerge: (keepIndex: number, mergeIndices: number[]) => void;
  onSelectGroup: (indices: number[]) => void;
  onDismiss?: () => void;
}) {
  const isFa = locale === "fa";
  if (!groups.length) return null;

  const reasonLabel = {
    fa: { name: "نام شبیه", image: "عکس مشترک", both: "نام و عکس" },
    en: { name: "Similar name", image: "Shared image", both: "Name & image" },
  }[locale];

  return (
    <section className="space-y-3 rounded-[1.35rem] border border-amber-200/80 bg-amber-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-amber-900/70 uppercase">
            {isFa ? "تکراری‌ها" : "Duplicates"}
          </p>
          <p className="mt-1 text-sm text-ink">
            {isFa
              ? `${groups.length} گروه مشکوک — ادغام کن تا کاتالوگ تمیز شود.`
              : `${groups.length} possible groups — merge to clean the catalog.`}
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-ink"
            onClick={onDismiss}
          >
            {isFa ? "پنهان" : "Hide"}
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {groups.slice(0, 8).map((group) => {
          const keep = group.indices[0]!;
          const rest = group.indices.slice(1);
          return (
            <article
              key={group.indices.join("-")}
              className="rounded-2xl bg-white p-3 ring-1 ring-border/70"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f4f4f2] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {reasonLabel[group.reason]}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {group.indices.length} {isFa ? "محصول" : "items"}
                </span>
                <div className="ms-auto flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() => onSelectGroup(group.indices)}
                  >
                    {isFa ? "انتخاب" : "Select"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={pending}
                    onClick={() => onMerge(keep, rest)}
                  >
                    {isFa ? "ادغام در اولی" : "Merge into first"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {group.indices.map((i) => {
                  const p = items[i]!;
                  const img = mediaUrl(media, p.imageIds?.[0]);
                  return (
                    <button
                      key={i}
                      type="button"
                      className="w-28 shrink-0 text-start"
                      onClick={() => onMerge(i, group.indices.filter((x) => x !== i))}
                      title={isFa ? "ادغام بقیه در این" : "Merge others into this"}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#ecece9]">
                        {img ? (
                          <SiteImage
                            src={img}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                        ) : null}
                      </div>
                      <p className="mt-1.5 truncate text-[11px] font-medium text-ink">
                        {p.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {p.price != null
                          ? p.price.toLocaleString(isFa ? "fa-IR" : "en-US")
                          : isFa
                            ? "بدون قیمت"
                            : "No price"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {isFa
                  ? "روی کارت بزن تا بقیه داخل همان ادغام شوند."
                  : "Tap a card to keep it and merge the rest."}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
