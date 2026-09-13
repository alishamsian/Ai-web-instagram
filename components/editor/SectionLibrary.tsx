"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteSectionType } from "@/types/website";
import { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
import { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
import type { SectionCategory } from "@/lib/store/registry/types";
import { cn } from "@/lib/utils";
import { Plus, Search, X } from "lucide-react";

export function SectionLibrary({
  open,
  locale,
  dict,
  existingTypes,
  vertical,
  onClose,
  onAdd,
}: {
  open: boolean;
  locale: Locale;
  dict: Dictionary;
  existingTypes: Set<WebsiteSectionType>;
  vertical?: string | null;
  onClose: () => void;
  onAdd: (type: WebsiteSectionType) => void;
}) {
  const [category, setCategory] = useState<SectionCategory | "all">("all");
  const [query, setQuery] = useState("");

  const library = useMemo(
    () => getSectionLibraryItems({ vertical }),
    [vertical],
  );

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.label.en.toLowerCase().includes(q) ||
        item.label.fa.includes(query.trim()) ||
        item.description.en.toLowerCase().includes(q) ||
        item.description.fa.includes(query.trim()) ||
        item.type.includes(q)
      );
    });
  }, [category, library, query]);

  const categories = useMemo(() => {
    const used = new Set(library.map((item) => item.category));
    return SECTION_CATEGORIES.filter((item) => used.has(item.id));
  }, [library]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0D0D0F] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div>
            <p className="text-[15px] font-medium text-[#F7F7F8]">
              {dict.editor.addSection}
            </p>
            <p className="mt-0.5 text-[12px] text-[#77777F]">
              {dict.editor.sectionLibraryHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-[#77777F] hover:bg-white/[0.06] hover:text-[#F7F7F8]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
          <Search size={14} className="text-[#77777F]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "fa" ? "جستجوی سکشن…" : "Search sections…"}
            className="h-9 w-full bg-transparent text-[13px] text-[#F7F7F8] outline-none placeholder:text-[#55555C]"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
          <Chip
            active={category === "all"}
            label={locale === "fa" ? "همه" : "All"}
            onClick={() => setCategory("all")}
          />
          {categories.map((item) => (
            <Chip
              key={item.id}
              active={category === item.id}
              label={item[locale]}
              onClick={() => setCategory(item.id)}
            />
          ))}
        </div>

        <div className="grid gap-2 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4">
          {items.length === 0 ? (
            <p className="col-span-full py-8 text-center text-[12px] text-[#77777F]">
              {locale === "fa" ? "سکشن‌ی پیدا نشد" : "No sections found"}
            </p>
          ) : (
            items.map((item) => {
              const already = existingTypes.has(item.type);
              return (
                <div
                  key={item.type}
                  className="flex flex-col rounded-xl border border-white/[0.06] bg-[#111113] p-3.5 transition hover:border-white/12"
                >
                  <div className="mb-3 aspect-[16/9] rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02]" />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-[#F7F7F8]">
                      {item.label[locale]}
                    </p>
                    {item.recommended ? (
                      <span className="shrink-0 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-[#B5B5BC]">
                        {locale === "fa" ? "پیشنهادی" : "Recommended"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 flex-1 text-[12px] leading-5 text-[#77777F]">
                    {item.description[locale]}
                  </p>
                  <button
                    type="button"
                    disabled={already && item.type === "footer"}
                    onClick={() => {
                      onAdd(item.type);
                      onClose();
                    }}
                    className={cn(
                      "mt-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition",
                      already
                        ? "bg-white/[0.04] text-[#B5B5BC] hover:bg-white/[0.08]"
                        : "bg-[#FF6B57] text-white hover:bg-[#ff7d6c]",
                    )}
                  >
                    <Plus size={13} />
                    {already ? dict.editor.showSection : dict.editor.addSection}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition",
        active
          ? "bg-white/[0.1] text-[#F7F7F8]"
          : "text-[#77777F] hover:bg-white/[0.04] hover:text-[#B5B5BC]",
      )}
    >
      {label}
    </button>
  );
}
