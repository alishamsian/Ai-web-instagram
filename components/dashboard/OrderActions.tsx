"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

function waLink(phone: string | null | undefined, text: string) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function OrderActions({
  orderId,
  status,
  locale,
  whatsapp,
  summary,
}: {
  orderId: string;
  status: string;
  locale: "fa" | "en";
  whatsapp?: string | null;
  summary: string;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState(false);

  const tone =
    current === "done"
      ? ("success" as const)
      : current === "seen"
        ? ("accent" as const)
        : ("warning" as const);

  const next =
    current === "new" ? "seen" : current === "seen" ? "done" : null;

  async function setStatus(nextStatus: string) {
    setPending(true);
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(false);
    if (!response.ok) return;
    setCurrent(nextStatus);
    router.refresh();
  }

  const chat = waLink(
    whatsapp,
    isFa
      ? `سلام، درباره سفارش: ${summary}`
      : `Hi, about your order: ${summary}`,
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusBadge tone={tone}>{current}</StatusBadge>
      {next ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void setStatus(next)}
        >
          {pending
            ? "…"
            : next === "seen"
              ? isFa
                ? "دیدم"
                : "Mark seen"
              : isFa
                ? "انجام شد"
                : "Done"}
        </Button>
      ) : null}
      {chat ? (
        <Button asChild size="sm" variant="ghost">
          <a href={chat} target="_blank" rel="noreferrer">
            WhatsApp
            <ExternalLink className="size-3 opacity-60" aria-hidden />
          </a>
        </Button>
      ) : null}
      {current === "done" ? (
        <button
          type="button"
          className={cn("text-[11px] text-muted-foreground hover:text-ink")}
          disabled={pending}
          onClick={() => void setStatus("archived")}
        >
          {isFa ? "بایگانی" : "Archive"}
        </button>
      ) : null}
    </div>
  );
}
