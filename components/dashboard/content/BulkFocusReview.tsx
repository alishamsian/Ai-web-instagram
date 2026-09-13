"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteImage } from "@/components/website/SiteImage";
import {
  extractPriceFromText,
  mediaUrl,
  type StudioProduct,
} from "@/components/dashboard/content/catalog-utils";
import { cn } from "@/lib/utils";

export type ReviewField = "price" | "category" | "currency" | "name";

export function BulkFocusReview({
  queue,
  items,
  media,
  locale,
  field,
  pending,
  onFieldChange,
  onClose,
  onCommit,
  onSuggestFromAi,
}: {
  queue: number[];
  items: StudioProduct[];
  media: Record<string, { url: string; type?: string }>;
  locale: "fa" | "en";
  field: ReviewField;
  pending: boolean;
  onFieldChange: (field: ReviewField) => void;
  onClose: () => void;
  onCommit: (
    patches: Array<{ index: number; product: Partial<StudioProduct> }>,
  ) => Promise<boolean>;
  onSuggestFromAi?: (index: number) => Promise<{
    price: number;
    currency: string | null;
  } | null>;
}) {
  const isFa = locale === "fa";
  const [cursor, setCursor] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [hint, setHint] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = queue[cursor] ?? null;
  const product = index != null ? items[index] : null;
  const queueKey = queue.join(",");

  useEffect(() => {
    setCursor(0);
    setDrafts({});
    setHint("");
  }, [queueKey]);

  useEffect(() => {
    setDrafts({});
    setHint("");
  }, [field]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    setHint("");
  }, [cursor, field]);

  function valueFor(i: number, p: StudioProduct): string {
    if (drafts[i] !== undefined) return drafts[i]!;
    if (field === "price") return p.price != null ? String(p.price) : "";
    if (field === "category") return p.category ?? "";
    if (field === "currency") return p.currency ?? "";
    return p.name ?? "";
  }

  function patchFromDraft(raw: string): Partial<StudioProduct> {
    if (field === "price") {
      const trimmed = raw.trim();
      if (!trimmed) return { price: null };
      const n = Number(trimmed.replace(/,/g, ""));
      return { price: Number.isFinite(n) ? n : null };
    }
    if (field === "category") return { category: raw.trim() };
    if (field === "currency") return { currency: raw.trim() || null };
    return { name: raw.trim() || (isFa ? "بدون نام" : "Untitled") };
  }

  function setCurrentDraft(value: string) {
    if (index == null) return;
    setDrafts((prev) => ({ ...prev, [index]: value }));
  }

  function previousFieldValue(): string | null {
    for (let c = cursor - 1; c >= 0; c--) {
      const prevIndex = queue[c];
      if (prevIndex == null) continue;
      const p = items[prevIndex];
      if (!p) continue;
      const v = valueFor(prevIndex, p).trim();
      if (v) return v;
      if (field === "price" && p.price != null) return String(p.price);
      if (field === "category" && p.category?.trim()) return p.category;
      if (field === "currency" && p.currency) return p.currency;
      if (field === "name" && p.name?.trim()) return p.name;
    }
    return null;
  }

  function copyPrevious() {
    const prev = previousFieldValue();
    if (prev == null) {
      setHint(isFa ? "مقدار قبلی پیدا نشد" : "No previous value");
      return;
    }
    setCurrentDraft(prev);
    setHint(isFa ? "از قبلی کپی شد" : "Copied from previous");
    requestAnimationFrame(() => inputRef.current?.select());
  }

  async function suggestPrice() {
    if (index == null || !product || field !== "price") return;
    const local = extractPriceFromText(
      `${product.name}\n${product.description ?? ""}`,
      locale,
    );
    if (local) {
      setCurrentDraft(String(local.price));
      setHint(
        isFa
          ? `از کپشن پیدا شد (${local.currency ?? "—"})`
          : `From caption (${local.currency ?? "—"})`,
      );
      return;
    }
    if (!onSuggestFromAi) {
      setHint(isFa ? "قیمتی در کپشن نبود" : "No price in caption");
      return;
    }
    setSuggesting(true);
    const ai = await onSuggestFromAi(index);
    setSuggesting(false);
    if (!ai) {
      setHint(isFa ? "پیشنهادی پیدا نشد" : "No suggestion found");
      return;
    }
    setCurrentDraft(String(ai.price));
    setHint(
      isFa
        ? `پیشنهاد AI (${ai.currency ?? "—"})`
        : `AI suggestion (${ai.currency ?? "—"})`,
    );
  }

  async function flushAndClose() {
    const patches = queue
      .filter((i) => drafts[i] !== undefined)
      .map((i) => ({
        index: i,
        product: patchFromDraft(drafts[i]!),
      }));
    if (!patches.length) {
      onClose();
      return;
    }
    const ok = await onCommit(patches);
    if (ok) onClose();
  }

  async function saveAndNext() {
    if (index == null || !product) return;
    const raw = valueFor(index, product);
    const nextDrafts = { ...drafts, [index]: raw };
    setDrafts(nextDrafts);

    if (cursor >= queue.length - 1) {
      const toSave = Object.entries(nextDrafts).map(([k, v]) => ({
        index: Number(k),
        product: patchFromDraft(v),
      }));
      const ok = await onCommit(toSave);
      if (ok) onClose();
      return;
    }
    setCursor((c) => c + 1);
  }

  function skip() {
    if (cursor >= queue.length - 1) {
      void flushAndClose();
      return;
    }
    setCursor((c) => c + 1);
  }

  if (!product || index == null) return null;

  const img = mediaUrl(media, product.imageIds?.[0]);
  const progress = ((cursor + 1) / queue.length) * 100;
  const draft = valueFor(index, product);
  const canCopyPrev = previousFieldValue() != null;

  const fieldLabels: Record<ReviewField, string> = isFa
    ? {
        price: "قیمت",
        category: "دسته",
        currency: "واحد پول",
        name: "نام",
      }
    : {
        price: "Price",
        category: "Category",
        currency: "Currency",
        name: "Name",
      };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[4px]"
        aria-label={isFa ? "بستن" : "Close"}
        onClick={() => void flushAndClose()}
      />

      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="h-1 bg-border/60">
          <div
            className="h-full bg-ink transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {isFa ? "ویرایش سریع" : "Quick edit"}
            </p>
            <p className="mt-0.5 text-sm text-ink">
              <span className="tabular-nums font-medium">
                {cursor + 1}/{queue.length}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {fieldLabels[field]}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void flushAndClose()}
            className="inline-flex size-8 items-center justify-center rounded-full bg-[#f4f4f2] text-muted-foreground hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex gap-1 px-5 pb-3">
          {(Object.keys(fieldLabels) as ReviewField[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFieldChange(f)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                field === f
                  ? "bg-ink text-white"
                  : "bg-[#f4f4f2] text-muted-foreground hover:text-ink",
              )}
            >
              {fieldLabels[f]}
            </button>
          ))}
        </div>

        <div className="mx-5 mb-4 flex items-center gap-4 rounded-2xl bg-[#f6f6f4] p-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#ecece9]">
            {img ? (
              <SiteImage
                src={img}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">
              {product.name || (isFa ? "بدون نام" : "Untitled")}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground">
              {product.description?.trim() ||
                product.category ||
                (isFa ? "بدون توضیح" : "No caption")}
            </p>
          </div>
        </div>

        <div className="px-5 pb-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {fieldLabels[field]}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!canCopyPrev}
                onClick={copyPrevious}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-[#f4f4f2] hover:text-ink disabled:opacity-40"
              >
                <Copy className="size-3" aria-hidden />
                {isFa ? "کپی قبلی" : "Copy prev"}
                <kbd className="ms-0.5 rounded bg-[#ecece9] px-1 font-mono text-[9px]">
                  =
                </kbd>
              </button>
              {field === "price" ? (
                <button
                  type="button"
                  disabled={suggesting || pending}
                  onClick={() => void suggestPrice()}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-[#f4f4f2] hover:text-ink disabled:opacity-40"
                >
                  <Sparkles className="size-3" aria-hidden />
                  {suggesting
                    ? "…"
                    : isFa
                      ? "از کپشن"
                      : "From caption"}
                </button>
              ) : null}
            </div>
          </div>
          <Input
            ref={inputRef}
            className="h-12 border-border/80 text-base"
            type={field === "price" ? "number" : "text"}
            inputMode={field === "price" ? "decimal" : "text"}
            value={draft}
            onChange={(e) => setCurrentDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "=" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const el = e.currentTarget;
                if (!el.value) {
                  e.preventDefault();
                  copyPrevious();
                }
              }
              if (e.key === "Enter") {
                e.preventDefault();
                void saveAndNext();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                void flushAndClose();
              }
            }}
            placeholder={
              field === "price"
                ? isFa
                  ? "مثلاً 450000"
                  : "e.g. 45"
                : field === "currency"
                  ? isFa
                    ? "IRT / USD"
                    : "USD"
                  : undefined
            }
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {hint ||
              (isFa
                ? "Enter → بعدی · = کپی قبلی · Esc پایان"
                : "Enter → next · = copy prev · Esc done")}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 border-t border-border bg-[#fafafa] px-5 py-4">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={cursor === 0}
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
          >
            {isFa ? (
              <ArrowRight className="size-3.5" aria-hidden />
            ) : (
              <ArrowLeft className="size-3.5" aria-hidden />
            )}
            {isFa ? "قبلی" : "Back"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={skip}>
            {isFa ? "رد کردن" : "Skip"}
          </Button>
          <Button
            type="button"
            className="ms-auto"
            size="sm"
            disabled={pending}
            onClick={() => void saveAndNext()}
          >
            <Check className="size-3.5" aria-hidden />
            {cursor >= queue.length - 1
              ? isFa
                ? "ذخیره و پایان"
                : "Save & done"
              : isFa
                ? "بعدی"
                : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
