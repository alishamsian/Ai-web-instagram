import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
  as: Comp = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "header" | "footer" | "main";
}) {
  return <Comp className={cn("container-page", className)}>{children}</Comp>;
}

export function Section({
  id,
  className,
  children,
  container = true,
  tone = "transparent",
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  container?: boolean;
  tone?: "transparent" | "white" | "muted" | "ink";
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-20 md:py-28",
        tone === "white" && "bg-page-elevated",
        tone === "muted" && "bg-muted",
        tone === "ink" && "bg-ink text-white",
        className,
      )}
    >
      {container ? <div className="container-page">{children}</div> : children}
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}
