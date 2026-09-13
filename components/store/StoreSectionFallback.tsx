"use client";

import type { WebsiteRenderMode } from "@/components/editor/EditContext";

/** Neutral fallback for unknown / unimplemented Store sections. */
export function StoreSectionFallback({
  type,
  locale,
  mode,
}: {
  type: string;
  locale: "fa" | "en";
  mode: WebsiteRenderMode;
}) {
  if (mode === "published") {
    return null;
  }

  return (
    <section
      className="store-section"
      data-section-fallback={type}
      aria-label={locale === "fa" ? "بخش ناشناخته" : "Unknown section"}
    >
      <div className="store-wrap">
        <p className="store-muted" style={{ margin: 0 }}>
          {locale === "fa"
            ? `بخش «${type}» در این قالب فروشگاه هنوز تعریف نشده است.`
            : `Section “${type}” is not available in this store template yet.`}
        </p>
      </div>
    </section>
  );
}
