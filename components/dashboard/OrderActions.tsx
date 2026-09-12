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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={tone}>
          {orderStatusLabel(current, locale)}
        </StatusBadge>
        {next ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-10 flex-1 sm:min-h-9 sm:flex-none"
            disabled={pending}
            onClick={() => void setStatus(next)}
          >
            {pending ? "…" : nextOrderStatusLabel(next, locale)}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {chat ? (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="min-h-10 flex-1 sm:min-h-9 sm:flex-none"
          >
            <a href={chat} target="_blank" rel="noreferrer">
              {isFa ? "پیام به مشتری" : "Message customer"}
              <ExternalLink className="size-3 opacity-60" aria-hidden />
            </a>
          </Button>
        ) : null}
        {current === "delivered" ? (
          <button
            type="button"
            className={cn(
              "inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-xs text-muted-foreground hover:bg-muted hover:text-ink sm:min-h-9",
            )}
            disabled={pending}
            onClick={() => void setStatus("archived")}
          >
            {isFa ? "بایگانی" : "Archive"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
