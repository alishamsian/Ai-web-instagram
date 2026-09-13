"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type StoreButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "text"
  | "on-dark";

function buttonClass(
  variant: StoreButtonVariant,
  size: "sm" | "md" | "lg",
  block?: boolean,
  className?: string,
) {
  const v =
    variant === "primary"
      ? "solid"
      : variant === "secondary"
        ? "secondary"
        : variant;
  return cn(
    "store-btn",
    `store-btn--${v}`,
    size === "sm" && "store-btn--sm",
    size === "lg" && "store-btn--lg",
    block && "store-btn--block",
    className,
  );
}

export const StoreButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: StoreButtonVariant;
    size?: "sm" | "md" | "lg";
    block?: boolean;
  }
>(function StoreButton(
  { className, variant = "primary", size = "md", block, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, block, className)}
      {...props}
    />
  );
});

export const StoreLinkButton = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: StoreButtonVariant;
    size?: "sm" | "md" | "lg";
    block?: boolean;
  }
>(function StoreLinkButton(
  { className, variant = "primary", size = "md", block, ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      className={buttonClass(variant, size, block, className)}
      {...props}
    />
  );
});

export const StoreInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function StoreInput({ className, ...props }, ref) {
  return <input ref={ref} className={cn("store-input", className)} {...props} />;
});

export const StoreIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function StoreIconButton({ className, type = "button", ...props }, ref) {
  return (
    <button ref={ref} type={type} className={cn("store-icon-btn", className)} {...props} />
  );
});

export function StoreKicker({
  children,
  className,
  onDark,
}: {
  children: ReactNode;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <p className={cn("store-kicker", onDark && "store-kicker--on-dark", className)}>
      {children}
    </p>
  );
}

export function StoreSectionHead({
  kicker,
  title,
  lead,
  className,
  row,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  row?: boolean;
}) {
  return (
    <div
      className={cn(
        "store-section__head",
        row && "store-section__head--row",
        className,
      )}
    >
      {kicker ? <div className="store-kicker">{kicker}</div> : null}
      <h2 className="store-heading">{title}</h2>
      {lead ? <p className="store-lead">{lead}</p> : null}
    </div>
  );
}
