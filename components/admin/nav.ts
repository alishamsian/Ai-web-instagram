import type { Locale } from "@/lib/config/env";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  Clock,
  CreditCard,
  Database,
  Flag,
  FlaskConical,
  Globe,
  HardDrive,
  HeartPulse,
  ImageIcon,
  LayoutDashboard,
  Link2,
  ListTodo,
  Newspaper,
  Radio,
  ScrollText,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Siren,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

export type AdminNavItem = {
  id: string;
  href: string;
  label: { fa: string; en: string };
  icon: LucideIcon;
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
      { id: "dashboard", href: "/dashboard", label: { fa: "داشبورد", en: "Dashboard" }, icon: LayoutDashboard },
      { id: "activity", href: "/activity", label: { fa: "فعالیت زنده", en: "Live Activity" }, icon: Activity },
    ],
  },
  {
    id: "business",
    label: { fa: "کسب‌وکار", en: "Business" },
    items: [
      { id: "users", href: "/users", label: { fa: "کاربران", en: "Users" }, icon: Users },
      { id: "workspaces", href: "/workspaces", label: { fa: "ورک‌اسپیس‌ها", en: "Workspaces" }, icon: Building2 },
      { id: "subscriptions", href: "/subscriptions", label: { fa: "اشتراک‌ها", en: "Subscriptions" }, icon: CreditCard },
      { id: "billing", href: "/billing", label: { fa: "صورتحساب", en: "Billing" }, icon: CreditCard },
      { id: "revenue", href: "/revenue", label: { fa: "درآمد", en: "Revenue" }, icon: CreditCard },
      { id: "orders", href: "/orders", label: { fa: "سفارش‌ها", en: "Orders" }, icon: ShoppingBag },
    ],
  },
  {
    id: "product",
    label: { fa: "محصول", en: "Product" },
    items: [
      { id: "websites", href: "/websites", label: { fa: "سایت‌ها", en: "Websites" }, icon: Globe },
      { id: "imports", href: "/imports", label: { fa: "ایمپورت‌ها", en: "Imports" }, icon: Radio },
      { id: "jobs", href: "/jobs", label: { fa: "جاب‌ها", en: "Jobs" }, icon: Workflow },
      { id: "content", href: "/content", label: { fa: "محتوا", en: "Content" }, icon: Newspaper },
      { id: "publishing", href: "/publishing", label: { fa: "انتشار", en: "Publishing" }, icon: Send },
      { id: "domains", href: "/domains", label: { fa: "دامین‌ها", en: "Domains" }, icon: Link2 },
      { id: "media", href: "/media", label: { fa: "مدیا", en: "Media" }, icon: ImageIcon },
    ],
  },
  {
    id: "ai",
    label: { fa: "هوش مصنوعی", en: "AI" },
    items: [
      { id: "ai", href: "/ai", label: { fa: "نمای کلی", en: "Overview" }, icon: Bot },
      { id: "ai-requests", href: "/ai/requests", label: { fa: "درخواست‌ها", en: "Requests" }, icon: ListTodo },
      { id: "ai-usage", href: "/ai/usage", label: { fa: "مصرف", en: "Usage" }, icon: Activity },
      { id: "ai-costs", href: "/ai/costs", label: { fa: "هزینه", en: "Costs" }, icon: CreditCard },
      { id: "ai-models", href: "/ai/models", label: { fa: "مدل‌ها", en: "Models" }, icon: Bot },
      { id: "ai-providers", href: "/ai/providers", label: { fa: "ارائه‌دهنده", en: "Providers" }, icon: Radio },
      { id: "ai-prompts", href: "/ai/prompts", label: { fa: "پرامپت‌ها", en: "Prompts" }, icon: Newspaper },
      { id: "ai-failures", href: "/ai/failures", label: { fa: "خطاها", en: "Failures" }, icon: AlertTriangle },
      { id: "ai-latency", href: "/ai/latency", label: { fa: "تأخیر", en: "Latency" }, icon: Clock },
      { id: "ai-anomalies", href: "/ai/anomalies", label: { fa: "ناهنجاری", en: "Anomalies" }, icon: Siren },
    ],
  },
  {
    id: "analytics",
    label: { fa: "آنالیتیکس", en: "Analytics" },
    items: [
      { id: "growth", href: "/growth", label: { fa: "رشد", en: "Growth" }, icon: BarChart3 },
      { id: "a-product", href: "/analytics/product", label: { fa: "محصول", en: "Product" }, icon: BarChart3 },
      { id: "a-users", href: "/analytics/users", label: { fa: "کاربران", en: "Users" }, icon: Users },
      { id: "a-retention", href: "/analytics/retention", label: { fa: "نگه‌داشت", en: "Retention" }, icon: BarChart3 },
      { id: "a-cohorts", href: "/analytics/cohorts", label: { fa: "هم‌گروه", en: "Cohorts" }, icon: BarChart3 },
      { id: "a-funnels", href: "/analytics/funnels", label: { fa: "قیف", en: "Funnels" }, icon: BarChart3 },
      { id: "a-features", href: "/analytics/features", label: { fa: "فیچرها", en: "Features" }, icon: Flag },
    ],
  },
  {
    id: "cs",
    label: { fa: "موفقیت مشتری", en: "Customer Success" },
    items: [
      { id: "health", href: "/health", label: { fa: "سلامت", en: "Health" }, icon: HeartPulse },
      { id: "at-risk", href: "/at-risk", label: { fa: "در خطر", en: "At Risk" }, icon: AlertTriangle },
      { id: "support", href: "/support", label: { fa: "پشتیبانی", en: "Support" }, icon: Users, comingSoon: true },
    ],
  },
  {
    id: "ops",
    label: { fa: "عملیات", en: "Operations" },
    items: [
      { id: "ops-overview", href: "/ops", label: { fa: "نمای کلی", en: "Overview" }, icon: HardDrive },
      { id: "errors", href: "/errors", label: { fa: "خطاها / هشدارها", en: "Errors / Alerts" }, icon: AlertTriangle },
      { id: "queues", href: "/queues", label: { fa: "صف‌ها", en: "Queues" }, icon: ListTodo },
      { id: "jobs", href: "/jobs", label: { fa: "جاب‌ها", en: "Jobs" }, icon: Workflow },
      { id: "webhooks", href: "/webhooks", label: { fa: "وب‌هوک", en: "Webhooks" }, icon: Webhook },
      { id: "cron", href: "/cron", label: { fa: "Cron", en: "Cron" }, icon: Clock },
      { id: "system", href: "/system", label: { fa: "وابستگی‌ها", en: "Dependencies" }, icon: HardDrive },
      { id: "incidents", href: "/incidents", label: { fa: "حوادث", en: "Incidents" }, icon: Siren },
    ],
  },
  {
    id: "control",
    label: { fa: "کنترل", en: "Control" },
    items: [
      { id: "security", href: "/security", label: { fa: "امنیت", en: "Security" }, icon: Shield },
      { id: "audit", href: "/audit", label: { fa: "ممیزی", en: "Audit" }, icon: ScrollText },
      { id: "flags", href: "/flags", label: { fa: "فلگ‌ها", en: "Feature Flags" }, icon: Flag, comingSoon: true },
      { id: "experiments", href: "/experiments", label: { fa: "آزمایش‌ها", en: "Experiments" }, icon: FlaskConical, comingSoon: true },
      { id: "database", href: "/database", label: { fa: "دیتابیس", en: "Database" }, icon: Database, comingSoon: true },
    ],
  },
  {
    id: "system",
    label: { fa: "سیستم", en: "System" },
    items: [
      { id: "settings", href: "/settings", label: { fa: "تنظیمات", en: "Settings" }, icon: Settings },
      { id: "infra", href: "/infra", label: { fa: "Infra", en: "Infra" }, icon: HardDrive },
    ],
  },
];
