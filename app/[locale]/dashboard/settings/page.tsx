import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import {
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const planLabel =
    session.workspace.plan === "pro"
      ? locale === "fa"
        ? "حرفه‌ای"
        : "Pro"
      : locale === "fa"
        ? "شروع"
        : "Starter";

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navAccount}
        title={dict.dashboard.settingsTitle}
        description={dict.dashboard.settingsBody}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={dict.dashboard.profile}>
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-xs text-muted-foreground">{dict.dashboard.name}</dt>
              <dd className="text-sm text-ink">
                {session.user.name || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-xs text-muted-foreground">{dict.dashboard.email}</dt>
              <dd className="truncate text-sm text-ink">{session.user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-xs text-muted-foreground">
                {dict.dashboard.language}
              </dt>
              <dd className="text-sm text-ink">
                {locale === "fa" ? "فارسی" : "English"}
              </dd>
            </div>
          </dl>
          <div className="border-t border-border p-4 md:hidden">
            <SignOutButton label={dict.dashboard.signOut} locale={locale} />
          </div>
        </Panel>

        <Panel title={dict.dashboard.workspace}>
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-xs text-muted-foreground">
                {dict.dashboard.workspace}
              </dt>
              <dd className="text-sm text-ink">{session.workspace.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="text-xs text-muted-foreground">{dict.dashboard.plan}</dt>
              <dd>
                <StatusBadge tone="accent">{planLabel}</StatusBadge>
              </dd>
            </div>
          </dl>
          <div className="border-t border-border p-4">
            <Button asChild className="w-full" variant="outline">
              <Link href={`/${locale}/dashboard/billing`}>
                {dict.dashboard.billing}
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel title={locale === "fa" ? "امنیت" : "Security"}>
          <PasswordChangeForm locale={locale} />
        </Panel>
      </div>
    </div>
  );
}
