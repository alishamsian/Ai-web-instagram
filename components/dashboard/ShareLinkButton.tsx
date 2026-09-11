"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareLinkButton({
  url,
  locale,
  size = "sm",
  variant = "outline",
  className,
}: {
  url: string;
  locale: "fa" | "en";
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  className?: string;
}) {
  const isFa = locale === "fa";
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  async function share() {
    try {
      if (canShare && navigator.share) {
        await navigator.share({
          title: isFa ? "فروشگاه من" : "My store",
          url,
        });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={() => void share()}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : canShare ? (
        <Share2 className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied
        ? isFa
          ? "کپی شد"
          : "Copied"
        : isFa
          ? "اشتراک لینک"
          : "Share link"}
    </Button>
  );
}
