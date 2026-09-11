import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { pricing } from "@/lib/config/pricing";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";
import { WaitlistForm } from "@/components/dashboard/WaitlistForm";
import { cn } from "@/lib/utils";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const current = session.workspace.plan === "pro" ? "pro" : "free";

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navAccount}
        title={dict.dashboard.billingTitle}
        description={dict.dashboard.billingBody}
      />

      <Panel
        title={dict.dashboard.currentPlan}
        action={
          <StatusBadge tone="accent">
            {current === "pro"
              ? locale === "fa"
                ? "حرفه‌ای"
                : "Pro"
              : locale === "fa"
                ? "شروع"
                : "Starter"}
          </StatusBadge>
        }
      >
        <div className="px-5 py-5 text-sm text-muted-foreground">
          {current === "pro"
            ? dict.dashboard.billingBody
            : dict.dashboard.freeForever}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {pricing.plans.map((plan) => {
          const active =
            (plan.id === "free" && current === "free") ||
            (plan.id === "pro" && current === "pro");
          const featured = plan.featured;
          return (
            <article
              key={plan.id}
              className={cn(
                "relative overflow-hidden rounded-[1.5rem] border bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]",
                active ? "border-ink" : "border-border",
                featured && "ring-1 ring-ink/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {plan.name[locale]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.description[locale]}
                  </p>
                </div>
                <StatusBadge tone={active ? "success" : "neutral"}>
                  {plan.badge[locale]}
                </StatusBadge>
              </div>

              <p className="mt-5 font-display text-3xl tracking-tight text-ink">
                {plan.price === 0
                  ? locale === "fa"
                    ? "رایگان"
                    : "Free"
                  : locale === "fa"
                    ? "به‌زودی"
                    : "Soon"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.period[locale]}
              </p>

              <ul className="mt-5 space-y-2.5">
                {plan.features[locale].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-ink"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-border pt-3">
                {plan.limits[locale].map((limit) => (
                  <p key={limit} className="text-xs text-muted-foreground">
                    {limit}
                  </p>
                ))}
              </div>

              <div className="mt-5">
                {plan.id === "free" ? (
                  <Button className="w-full" variant={active ? "outline" : "default"} disabled={active}>
                    {active
                      ? dict.dashboard.currentPlan
                      : plan.cta[locale]}
                  </Button>
                ) : active ? (
                  <Button className="w-full" variant="outline" disabled>
                    {dict.dashboard.currentPlan}
                  </Button>
                ) : (
                  <WaitlistForm locale={locale} source="billing" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
