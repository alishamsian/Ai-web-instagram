import type { getDictionary } from "@/lib/i18n/dictionary";
import type { DashboardNavItem } from "@/components/dashboard/DashboardNav";

export function buildDashboardNavItems(input: {
  dict: ReturnType<typeof getDictionary>;
  locale: "fa" | "en";
  websiteHref: string;
  freshOrders: number;
}): DashboardNavItem[] {
  const { dict, locale, websiteHref, freshOrders } = input;
  const isFa = locale === "fa";
  return [
    {
      href: "dashboard",
      icon: "dashboard",
      label: dict.dashboard.title,
      group: "main",
    },
    {
      href: websiteHref,
      icon: "website",
      label: dict.dashboard.website,
      group: "main",
      match: "dashboard/website",
    },
    {
      href: "dashboard/domains",
      icon: "domains",
      label: dict.dashboard.domains,
      group: "main",
    },
    {
      href: "dashboard/orders",
      icon: "orders",
      label: isFa ? "سفارش‌ها" : "Orders",
      group: "main",
      badge: freshOrders > 0 ? String(freshOrders) : undefined,
      badgeTone: freshOrders > 0 ? "alert" : undefined,
    },
    {
      href: "dashboard/import",
      icon: "import",
      label: dict.dashboard.import,
      group: "main",
    },
    {
      href: "dashboard/content/posts",
      icon: "posts",
      label: isFa ? "پست‌ها" : "Posts",
      group: "main",
    },
    {
      href: "dashboard/content/calendar",
      icon: "calendar",
      label: isFa ? "تقویم" : "Calendar",
      group: "main",
    },
    {
      href: "dashboard/channels",
      icon: "channels",
      label: isFa ? "کانال‌ها" : "Channels",
      group: "main",
    },
    {
      href: "dashboard/content/queue",
      icon: "queue",
      label: isFa ? "صف انتشار" : "Queue",
      group: "main",
    },
    {
      href: "dashboard/content",
      icon: "content",
      label: dict.dashboard.content,
      group: "main",
      exact: true,
    },
    {
      href: "dashboard/analytics",
      icon: "analytics",
      label: dict.dashboard.analytics,
      group: "growth",
    },
    {
      href: "dashboard/settings",
      icon: "settings",
      label: dict.dashboard.settings,
      group: "account",
    },
    {
      href: "dashboard/billing",
      icon: "billing",
      label: dict.dashboard.billing,
      group: "account",
    },
  ];
}
