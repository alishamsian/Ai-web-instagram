"use client";

/**
 * Placeholder for section types without a Puck/registry renderer.
 * Preserves data — never deletes unknown sections on save.
 */

import type { SectionConfig } from "@/types/website";

export function PuckUnsupportedSection({
  section,
  locale,
}: {
  section: SectionConfig;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  return (
    <div
      className="m-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-8 text-center"
      data-unsupported-section={section.type}
      data-section-id={section.id}
    >
      <p className="text-sm font-semibold text-amber-950">
        {isFa ? "سکشن پشتیبانی‌نشده" : "Unsupported section"}
      </p>
      <p className="mt-1 font-mono text-xs text-amber-900/80">
        {section.type}
      </p>
      <p className="mt-3 text-xs text-amber-900/70">
        {isFa
          ? "این محتوا حفظ می‌شود و هنگام ذخیره حذف نمی‌شود."
          : "This content is preserved and will not be deleted on save."}
      </p>
    </div>
  );
}
