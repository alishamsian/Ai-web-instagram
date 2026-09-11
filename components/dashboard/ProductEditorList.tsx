"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types/ai";

type EditableProduct = Product & { id?: string; slug?: string };

export function ProductEditorList({
  websiteId,
  products,
  locale,
}: {
  websiteId: string;
  products: EditableProduct[];
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const [items, setItems] = useState(products);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function saveItem(index: number) {
    const product = items[index];
    setSaving(product.id ?? String(index));
    setMessage("");
    const response = await fetch(`/api/websites/${websiteId}/products`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update",
        index,
        product: {
          name: product.name,
          price: product.price,
          currency: product.currency,
          category: product.category,
          description: product.description,
        },
      }),
    });
    setSaving(null);
    if (!response.ok) {
      setMessage(isFa ? "ذخیره ناموفق بود." : "Save failed.");
      return;
    }
    setMessage(isFa ? "ذخیره شد." : "Saved.");
  }

  async function move(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= items.length) return;
    const previous = items;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    setItems(next);
    setSaving(`move-${fromIndex}`);
    setMessage("");
    const response = await fetch(`/api/websites/${websiteId}/products`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        fromIndex,
        toIndex,
      }),
    });
    setSaving(null);
    if (!response.ok) {
      setItems(previous);
      setMessage(isFa ? "جابه‌جایی ناموفق بود." : "Reorder failed.");
      return;
    }
    setMessage(isFa ? "ترتیب ذخیره شد." : "Order saved.");
  }

  function update(index: number, patch: Partial<EditableProduct>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  if (!items.length) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm font-medium text-ink">
          {isFa ? "محصولی نیست." : "No products yet."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isFa
            ? "بعد از ورود از اینستاگرام، محصولات اینجا ظاهر می‌شوند."
            : "Products appear here after an Instagram import."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {message ? (
        <p className="rounded-xl bg-[#f6f6f4] px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60">
          {message}
        </p>
      ) : null}
      {items.map((product, index) => (
        <article
          key={product.id ?? `${product.name}-${index}`}
          className="rounded-2xl border border-border bg-[#fafafa] p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {isFa ? `محصول ${index + 1}` : `Product ${index + 1}`}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === 0 || Boolean(saving)}
                  onClick={() => void move(index, index - 1)}
                  aria-label={isFa ? "بالا" : "Move up"}
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={index === items.length - 1 || Boolean(saving)}
                  onClick={() => void move(index, index + 1)}
                  aria-label={isFa ? "پایین" : "Move down"}
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={saving === (product.id ?? String(index))}
              onClick={() => void saveItem(index)}
            >
              {saving === (product.id ?? String(index))
                ? "…"
                : isFa
                  ? "ذخیره"
                  : "Save"}
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-xs text-muted-foreground">
              {isFa ? "نام" : "Name"}
              <Input
                className="mt-1.5 bg-white"
                value={product.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              {isFa ? "دسته" : "Category"}
              <Input
                className="mt-1.5 bg-white"
                value={product.category ?? ""}
                onChange={(e) => update(index, { category: e.target.value })}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              {isFa ? "قیمت" : "Price"}
              <Input
                className="mt-1.5 bg-white"
                type="number"
                value={product.price ?? ""}
                onChange={(e) =>
                  update(index, {
                    price: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              {isFa ? "واحد" : "Currency"}
              <Input
                className="mt-1.5 bg-white"
                value={product.currency ?? ""}
                onChange={(e) =>
                  update(index, { currency: e.target.value || null })
                }
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-muted-foreground">
            {isFa ? "توضیح" : "Description"}
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
              value={product.description ?? ""}
              onChange={(e) => update(index, { description: e.target.value })}
            />
          </label>
        </article>
      ))}
    </div>
  );
}
