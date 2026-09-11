import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function getNavLinks(dict: Dictionary, locale: Locale) {
  return [
    { href: `/${locale}#examples`, label: dict.nav.examples },
    { href: `/${locale}#dashboard`, label: dict.nav.dashboard },
    { href: `/${locale}#pricing`, label: dict.nav.pricing },
  ] as const;
}

export function NavLinks({
  dict,
  locale,
  className,
  onNavigate,
}: {
  dict: Dictionary;
  locale: Locale;
  className?: string;
  onNavigate?: () => void;
}) {
  const links = getNavLinks(dict, locale);
  return (
    <ul className={cn("flex items-center gap-7", className)}>
      {links.map((link) => (
        <li
          key={link.href}
          className={link.href.includes("#examples") ? "hidden lg:list-item" : undefined}
        >
          <Link
            href={link.href}
            onClick={onNavigate}
            className="rounded-md px-1 py-1 text-sm font-medium text-foreground-muted transition-[color,background-color,opacity] duration-150 hover:bg-muted hover:text-foreground"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
