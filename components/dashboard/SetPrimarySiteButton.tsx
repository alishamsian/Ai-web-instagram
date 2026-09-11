"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRIMARY_SITE_COOKIE } from "@/lib/dashboard/primary-site";
import { cn } from "@/lib/utils";

export function SetPrimarySiteButton({
  websiteId,
  isPrimary,
  locale,
}: {
  websiteId: string;
  isPrimary: boolean;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function setPrimary() {
    setPending(true);
    document.cookie = `${PRIMARY_SITE_COOKIE}=${encodeURIComponent(websiteId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
    window.setTimeout(() => setPending(false), 400);
  }

  if (isPrimary) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200/80">
        <Star className="size-3 fill-current" aria-hidden />
        {isFa ? "سایت اصلی" : "Primary site"}
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      className={cn("text-xs")}
      onClick={setPrimary}
    >
      <Star className="size-3.5" aria-hidden />
      {pending ? "…" : isFa ? "سایت اصلی کن" : "Make primary"}
    </Button>
  );
}
