import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group/button relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[transform,background-color,border-color,box-shadow,opacity,color] duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "active:translate-y-0",
    "[&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-150",
    "hover:[&_svg[data-arrow]]:translate-x-0.5 rtl:hover:[&_svg[data-arrow]]:-translate-x-0.5",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-black focus-visible:ring-offset-white",
        accent: "bg-accent text-accent-foreground hover:brightness-110",
        outline: "border border-border bg-white text-foreground hover:border-ink/30",
        ghost: "text-foreground hover:bg-muted",
        link: "rounded-none px-0 text-foreground underline-offset-4 hover:underline",
        /* Marketing surfaces — light CTA for dark page */
        light:
          "bg-white text-[#080808] shadow-[0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-px hover:bg-[#f3f3f4] hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)] focus-visible:ring-offset-background",
        "ghost-dark":
          "text-foreground-muted hover:bg-muted hover:text-foreground focus-visible:ring-offset-background",
        soft: "border border-border bg-background-elevated text-foreground hover:border-border-strong hover:bg-background-subtle focus-visible:ring-offset-background",
        /* High-contrast CTA that works on both marketing themes */
        contrast:
          "bg-ink text-background shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:-translate-y-px hover:opacity-90 hover:shadow-[var(--elevated)] focus-visible:ring-offset-background",
      },
      size: {
        default: "h-11 min-h-11 rounded-[12px] px-5 text-sm",
        sm: "h-9 min-h-9 rounded-[10px] px-3.5 text-xs",
        lg: "h-12 min-h-12 rounded-[12px] px-6 text-[15px]",
        xl: "h-12 min-h-12 rounded-[12px] px-6 text-[15px] font-semibold sm:h-[48px]",
        icon: "size-11 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          <span className="opacity-90">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { buttonVariants };
