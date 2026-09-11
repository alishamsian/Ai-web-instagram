import Link from "next/link";
import { cn } from "@/lib/utils";

/** Live iframe phone frame — uses preview or public URL. */
export function LivePhonePreview({
  src,
  locale,
  className,
  compact = false,
  hideLink = false,
}: {
  src: string;
  locale: "fa" | "en";
  className?: string;
  compact?: boolean;
  hideLink?: boolean;
}) {
  const isFa = locale === "fa";

  return (
    <div
      className={cn(
        "mx-auto w-full",
        compact ? "max-w-[148px]" : "max-w-[168px]",
        className,
      )}
    >
      <div
        className={cn(
          "overflow-hidden border border-black/10 bg-[#111] shadow-[0_12px_32px_rgba(0,0,0,0.12)]",
          compact ? "rounded-[1.25rem] p-1" : "rounded-[1.45rem] p-1.5",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-white",
            compact
              ? "aspect-[9/16] rounded-[1rem]"
              : "aspect-[9/16] rounded-[1.15rem]",
          )}
        >
          <iframe
            title={isFa ? "پیش‌نمایش زنده" : "Live preview"}
            src={src}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
      {!hideLink ? (
        <p className="mt-2.5 text-center text-[10px] text-muted-foreground">
          <Link
            href={src}
            target="_blank"
            className="hover:text-ink hover:underline"
            rel="noreferrer"
          >
            {isFa ? "تمام‌صفحه" : "Full screen"}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
