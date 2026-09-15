"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminErrorState } from "@/components/admin/primitives";

/**
 * Admin route-segment error boundary. Keeps the shell (sidebar/topbar) alive,
 * never echoes the raw error message (may contain SQL / table names), and
 * surfaces the Next.js digest so the founder can correlate with server logs.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const isFa = pathname?.startsWith("/fa") ?? true;

  useEffect(() => {
    // Client-side breadcrumb only; the server already logged the full error.
    console.error("[admin] route error", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-10">
      <AdminErrorState
        title={
          isFa
            ? "این بخش ادمین با خطا مواجه شد"
            : "This admin section failed to render"
        }
        body={
          (isFa
            ? "جزئیات کامل در لاگ سرور ثبت شده است."
            : "Full details are in the server log.") +
          (error.digest ? ` · digest: ${error.digest}` : "")
        }
        onRetry={reset}
      />
    </div>
  );
}
