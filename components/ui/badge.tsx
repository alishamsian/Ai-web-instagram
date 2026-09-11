import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "ai" | "soft";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "default" && "border-border bg-white text-muted-foreground",
        tone === "soft" && "border-transparent bg-muted text-muted-foreground",
        tone === "ai" && "border-transparent bg-ai-soft text-ai",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  elevated = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground",
        elevated ? "shadow-[var(--elevated)]" : "shadow-none",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} role="separator" />;
}
