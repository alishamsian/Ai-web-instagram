"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PRIMARY_SITE_COOKIE } from "@/lib/dashboard/primary-site";
import { cn } from "@/lib/utils";

export function DeleteSiteButton({
  websiteId,
  label,
  confirmMessage,
  errorMessage,
  redirectTo,
  className,
  siteName,
  locale = "fa",
}: {
  websiteId: string;
  label: string;
  confirmMessage: string;
  errorMessage: string;
  /** After delete, navigate here (e.g. dashboard home when viewing hub). */
  redirectTo?: string;
  className?: string;
  siteName?: string;
  locale?: "fa" | "en";
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, setPending] = useState(false);
  const isFa = locale === "fa";

  async function onDelete() {
    if (pending) return;

    const ok = await confirm({
      title: isFa ? "حذف سایت" : "Delete site",
      description: confirmMessage,
      detail: siteName,
      tone: "danger",
      confirmLabel: label,
      cancelLabel: isFa ? "انصراف" : "Cancel",
    });
    if (!ok) return;

    setPending(true);
    try {
      const response = await fetch(`/api/websites/${websiteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        window.alert(payload.message || errorMessage);
        return;
      }

      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${PRIMARY_SITE_COOKIE}=`));
      const primary = match
        ? decodeURIComponent(match.split("=").slice(1).join("="))
        : null;
      if (primary === websiteId) {
        document.cookie = `${PRIMARY_SITE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
      }

      if (redirectTo) {
        router.replace(redirectTo);
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      window.alert(errorMessage);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      disabled={pending}
      loading={pending}
      onClick={() => void onDelete()}
    >
      <Trash2 className="size-3.5" aria-hidden />
      {label}
    </Button>
  );
}
