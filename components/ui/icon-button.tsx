import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md transition-[background-color,color,border-color,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        outline: "border border-border bg-white text-foreground hover:border-ink/30",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        solid: "bg-ink text-white hover:bg-black",
      },
      size: {
        sm: "size-8",
        default: "size-10",
        lg: "size-11",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
);

/**
 * Icon-only control. `label` is required because there is no visible text.
 */
export function IconButton({
  className,
  variant,
  size,
  asChild = false,
  label,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    asChild?: boolean;
    label: string;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : "button"}
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { iconButtonVariants };
