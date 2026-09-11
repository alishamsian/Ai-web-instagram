"use client";

import { useState } from "react";
import { Check, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BioLinkButton({
  url,
  brandName,
  locale,
}: {
  url: string;
  brandName: string;
  locale: "fa" | "en";
}) {
  const isFa = locale === "fa";
  const [copied, setCopied] = useState(false);

  const bioText = isFa
    ? `🛍 فروشگاه آنلاین ${brandName}\n${url}`
    : `🛍 Shop ${brandName}\n${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(bioText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <AtSign className="size-3.5" aria-hidden />
      )}
      {copied
        ? isFa
          ? "کپی شد"
          : "Copied"
        : isFa
          ? "کپی لینک بیو"
          : "Copy bio link"}
    </Button>
  );
}
