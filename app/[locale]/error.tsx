"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Locale route-segment error boundary.
 * Never echoes raw provider/DB/stack messages to the user.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const isFa = pathname?.startsWith("/fa") ?? true;

  useEffect(() => {
    console.error("[app] route error", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="font-display text-2xl tracking-tight">
        {isFa ? "مشکلی پیش آمد" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {isFa
          ? "صفحه با خطا مواجه شد. جزئیات در لاگ سرور ثبت شده است."
          : "This page failed to render. Details are in the server log."}
        {error.digest ? ` · ${error.digest}` : ""}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        {isFa ? "تلاش دوباره" : "Try again"}
      </button>
    </div>
  );
}
