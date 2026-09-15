import type { Locale } from "@/lib/config/env";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CreditCard,
  Database,
  Flag,
  FlaskConical,
  Globe,
  HardDrive,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  Newspaper,
  Radio,
  ScrollText,
  Settings,
  ShoppingBag,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";

export type AdminNavItem = {
  id: string;
  href: string;
  label: { fa: string; en: string };
  icon: LucideIcon;
  /** Later-phase placeholder — navigable but marked Coming soon */
  comingSoon?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: { fa: string; en: string };
  items: AdminNavItem[];
};

export function adminHref(locale: Locale, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}/admin${clean === "/" ? "" : clean}`;
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: "command",
    label: { fa: "مرکز فرمان", en: "Command Center" },
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        label: { fa: "داشبورد", en: "Dashboard" },
        icon: LayoutDashboard,
      },
      {
        id: "activity",
        href: "/activity",
        label: { fa: "فعالیت زنده", en: "Live Activity" },
        icon: Activity,
      },
    ],
  },
  {
    id: "business",
    label: { fa: "کسب‌وکار", en: "Business" },
    items: [
      {
        id: "users",
        href: "/users",
        label: { fa: "کاربران", en: "Users" },
        icon: Users,
      },
      {
        id: "workspaces",
        href: "/workspaces",
        label: { fa: "ورک‌اسپیس‌ها", en: "Workspaces" },
        icon: Building2,
      },
      {
        id: "revenue",
        href: "/revenue",
        label: { fa: "درآمد", en: "Revenue" },
        icon: CreditCard,
      },
      {
        id: "orders",
        href: "/orders",
        label: { fa: "سفارش‌ها", en: "Orders" },
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "product",
    label: { fa: "محصول", en: "Product" },
    items: [
      {
        id: "websites",
        href: "/websites",
        label: { fa: "سایت‌ها", en: "Websites" },
        icon: Globe,
      },
      {
        id: "imports",
        href: "/imports",
        label: { fa: "ایمپورت‌ها", en: "Imports" },
        icon: Radio,
      },
      {
        id: "jobs",
        href: "/jobs",
        label: { fa: "جاب‌ها", en: "Jobs" },
        icon: Workflow,
      },
      {
        id: "content",
        href: "/content",
        label: { fa: "محتوا", en: "Content" },
        icon: Newspaper,
        comingSoon: true,
      },
    ],
  },
  {
    id: "ai",
    label: { fa: "هوش مصنوعی", en: "AI" },
    items: [
      {
        id: "ai",
        href: "/ai",
        label: { fa: "نمای کلی AI", en: "AI Overview" },
        icon: Bot,
      },
    ],
  },
  {
    id: "analytics",
    label: { fa: "آنالیتیکس", en: "Analytics" },
    items: [
      {
        id: "analytics",
        href: "/analytics",
        label: { fa: "محصول", en: "Product" },
        icon: BarChart3,
        comingSoon: true,
      },
    ],
  },
  {
    id: "ops",
    label: { fa: "عملیات", en: "Operations" },
    items: [
      {
        id: "errors",
        href: "/errors",
        label: { fa: "خطاها و هشدارها", en: "Errors & Alerts" },
        icon: AlertTriangle,
      },
      {
        id: "system",
        href: "/system",
        label: { fa: "سلامت سیستم", en: "System Health" },
        icon: HeartPulse,
      },
      {
        id: "queues",
        href: "/queues",
        label: { fa: "صف‌ها", en: "Queues" },
        icon: ListTodo,
        comingSoon: true,
      },
    ],
  },
  {
    id: "control",
    label: { fa: "کنترل", en: "Control" },
    items: [
      {
        id: "audit",
        href: "/audit",
        label: { fa: "ممیزی", en: "Audit" },
        icon: ScrollText,
      },
      {
        id: "flags",
        href: "/flags",
        label: { fa: "فیچر فلگ", en: "Feature Flags" },
        icon: Flag,
        comingSoon: true,
      },
      {
        id: "experiments",
        href: "/experiments",
        label: { fa: "آزمایش‌ها", en: "Experiments" },
        icon: FlaskConical,
        comingSoon: true,
      },
      {
        id: "database",
        href: "/database",
        label: { fa: "دیتابیس", en: "Database" },
        icon: Database,
        comingSoon: true,
      },
    ],
  },
  {
    id: "system",
    label: { fa: "سیستم", en: "System" },
    items: [
      {
        id: "settings",
        href: "/settings",
        label: { fa: "تنظیمات", en: "Settings" },
        icon: Settings,
      },
      {
        id: "infra",
        href: "/infra",
        label: { fa: "زیرساخت", en: "Infrastructure" },
        icon: HardDrive,
        comingSoon: true,
      },
      {
        id: "tools",
        href: "/tools",
        label: { fa: "ابزارها", en: "Tools" },
        icon: Wrench,
        comingSoon: true,
      },
      {
        id: "support",
        href: "/support",
        label: { fa: "پشتیبانی", en: "Support" },
        icon: Briefcase,
        comingSoon: true,
      },
    ],
  },
];
