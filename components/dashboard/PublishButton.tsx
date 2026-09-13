"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PostPublishDialog } from "@/components/dashboard/PostPublishDialog";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function PublishButton({
  websiteId,
  published,
  publishLabel,
  unpublishLabel,
  locale = "en",
  blockers,
  onPublished,
  brandName,
  slug,
}: {
  websiteId: string;
  published: boolean;
  publishLabel: string;
  unpublishLabel: string;
  locale?: "fa" | "en";
  /** Incomplete non-optional readiness items — confirm before publish. */
  blockers?: { label: string; href?: string }[];
  onPublished?: () => void;
  brandName?: string;
  slug?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const isFa = locale === "fa";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  async function toggle() {
    if (published) {
      const ok = await confirm({
        title: isFa ? "لغو انتشار" : "Unpublish site",
        description: isFa
          ? "لغو انتشار، لینک عمومی را قطع می‌کند. مطمئنی؟"
          : "Unpublishing takes the public link offline. Continue?",
        tone: "warning",
        confirmLabel: unpublishLabel,
        cancelLabel: isFa ? "انصراف" : "Cancel",
      });
      if (!ok) return;
    } else if (blockers && blockers.length > 0) {
      const ok = await confirm({
        title: isFa ? "انتشار با نقص" : "Publish with gaps",
        description: isFa
          ? "قبل از انتشار چند مورد ناقص است. با این حال منتشر شود؟"
          : "Some setup is incomplete. Publish anyway?",
        detail: blockers.map((b) => `• ${b.label}`).join("\n"),
        tone: "warning",
        confirmLabel: publishLabel,
        cancelLabel: isFa ? "انصراف" : "Cancel",
      });
      if (!ok) return;
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/websites/${websiteId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        if (payload.error === "NO_PRODUCTS") {
          setError(
            isFa
              ? "حداقل یک محصول لازم است."
              : "Add at least one product first.",
          );
          return;
        }
        setError(
          payload.message ||
            (isFa ? "انتشار ناموفق بود." : "Publish failed."),
        );
        return;
      }
      if (!published) {
        onPublished?.();
        if (brandName && slug) setCelebrate(true);
      }
      router.refresh();
    } catch {
      setError(isFa ? "اتصال قطع شد." : "Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        size="sm"
        variant={published ? "outline" : "default"}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => void toggle()}
      >
        {pending ? "…" : published ? unpublishLabel : publishLabel}
      </Button>
      {error ? (
        <p className="max-w-[12rem] text-[11px] leading-4 text-red-700">
          {error}
        </p>
      ) : null}
      {brandName && slug ? (
        <PostPublishDialog
          open={celebrate}
          onClose={() => setCelebrate(false)}
          locale={locale}
          brandName={brandName}
          slug={slug}
          websiteId={websiteId}
        />
      ) : null}
    </div>
  );
}
