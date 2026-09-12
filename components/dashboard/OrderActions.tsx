"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/ui";
import {
  customerStatusMessage,
  nextOrderStatus,
  nextOrderStatusLabel,
  normalizeOrderStatus,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/orders/status";
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
  customerContact,
  brandName,
  summary,
}: {
  orderId: string;
  status: string;
  locale: "fa" | "en";
  whatsapp?: string | null;
  customerContact?: string | null;
  brandName?: string;
  summary: string;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [current, setCurrent] = useState(normalizeOrderStatus(status));
  const [pending, setPending] = useState(false);

  const tone = orderStatusTone(current);
  const next = nextOrderStatus(current);
  const contactPhone = customerContact || whatsapp;
  const message = customerStatusMessage({
    status: current === "new" ? "confirmed" : current,
    summary,
    brandName: brandName || (isFa ? "فروشگاه" : "Store"),
    locale,
  });
  const chat = waLink(contactPhone, message);

  async function setStatus(nextStatus: string) {
    setPending(true);
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(false);
    if (!response.ok) return;
    setCurrent(normalizeOrderStatus(nextStatus));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusBadge tone={tone}>
        {orderStatusLabel(current, locale)}
      </StatusBadge>
      {next ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void setStatus(next)}
        >
          {pending ? "…" : nextOrderStatusLabel(next, locale)}
        </Button>
      ) : null}
      {chat ? (
        <Button asChild size="sm" variant="ghost">
          <a href={chat} target="_blank" rel="noreferrer">
            {isFa ? "پیام به مشتری" : "Message customer"}
            <ExternalLink className="size-3 opacity-60" aria-hidden />
          </a>
        </Button>
      ) : null}
      {current === "delivered" ? (
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
