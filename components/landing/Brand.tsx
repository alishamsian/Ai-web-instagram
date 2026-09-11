import Link from "next/link";
import { cn } from "@/lib/utils";
import { brandConfig } from "@/lib/config/brand";

/** Abstract mark: profile circle → site frame (not Instagram). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      aria-hidden
      fill="none"
    >
      <rect
        x="4"
        y="6"
        width="24"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12.5" cy="14.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M18.5 12.5h5.5M18.5 16.5h4M18.5 20.5h5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Brand({
  href,
  name,
  className,
  markClassName,
}: {
  href: string;
  name?: string;
  className?: string;
  markClassName?: string;
}) {
  const label = name ?? brandConfig.name;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-foreground transition-opacity duration-150 hover:opacity-90",
        className,
      )}
    >
      <BrandMark className={cn("text-foreground", markClassName)} />
      <span>{label}</span>
    </Link>
  );
}
