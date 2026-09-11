import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  invalid,
  ...props
}: React.ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-12 w-full rounded-md border bg-white px-4 text-base text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground sm:text-sm",
        "border-border hover:border-foreground/25",
        "focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid &&
          "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: React.ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-border bg-white px-4 py-3 text-base outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground sm:text-sm",
        "hover:border-foreground/25 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/15",
        invalid && "border-destructive focus-visible:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function FieldMessage({
  className,
  tone = "muted",
  ...props
}: React.ComponentProps<"p"> & { tone?: "muted" | "error" | "success" }) {
  return (
    <p
      className={cn(
        "text-sm leading-6",
        tone === "muted" && "text-muted-foreground",
        tone === "error" && "text-destructive",
        tone === "success" && "text-success",
        className,
      )}
      {...props}
    />
  );
}
