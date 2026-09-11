import { cn } from "@/lib/utils";

export function Section({
  id,
  className,
  children,
  container = true,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  container?: boolean;
}) {
  return (
    <section id={id} className={cn("py-20 md:py-28", className)}>
      {container ? <div className="container-page">{children}</div> : children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "start",
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h2 className="font-display text-balance text-[1.85rem] leading-[1.15] text-ink md:text-[2.5rem] md:leading-[1.12]">
        {title}
      </h2>
      {body ? (
        <p
          className={cn(
            "mt-4 max-w-xl text-pretty text-[15px] leading-7 text-muted-foreground md:text-base md:leading-8",
            align === "center" && "mx-auto",
          )}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}
