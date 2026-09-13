"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function SiteSlugForm({
  websiteId,
  currentSlug,
  locale,
}: {
  websiteId: string;
  currentSlug: string;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const confirm = useConfirm();
  const [slug, setSlug] = useState(currentSlug);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const dirty = slug.trim() !== currentSlug;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    const ok = await confirm({
      title: isFa ? "تغییر آدرس سایت" : "Change site address",
      description: isFa
        ? "تغییر اسلاگ لینک قدیمی را می‌شکند. ادامه می‌دهی؟"
        : "Changing the slug breaks the old public URL. Continue?",
      detail: `/${currentSlug} → /${slug.trim()}`,
      tone: "warning",
      confirmLabel: isFa ? "تغییر بده" : "Change",
      cancelLabel: isFa ? "انصراف" : "Cancel",
    });
    if (!ok) return;
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/websites/${websiteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: slug.trim() }),
    });
    setPending(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setMessage(
        payload.error === "SLUG_TAKEN"
          ? isFa
            ? "این اسلاگ گرفته شده."
            : "Slug already taken."
          : isFa
            ? "ذخیره ناموفق بود."
            : "Could not save.",
      );
      return;
    }
    setMessage(isFa ? "اسلاگ به‌روز شد." : "Slug updated.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="block text-xs text-muted-foreground">
        {isFa ? "اسلاگ عمومی" : "Public slug"}
        <Input
          className="mt-1.5 h-9 font-mono text-xs"
          dir="ltr"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
      </label>
      <p className="text-[11px] leading-4 text-muted-foreground">
        {isFa
          ? "لینک‌های قبلی بعد از تغییر کار نمی‌کنند."
          : "Old links stop working after you change this."}
      </p>
      {message ? (
        <p className="text-xs text-muted-foreground">{message}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={!dirty || pending}>
        {pending ? "…" : isFa ? "ذخیره اسلاگ" : "Save slug"}
      </Button>
    </form>
  );
}
