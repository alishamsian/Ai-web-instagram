import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { pricing } from "@/lib/config/pricing";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageStack,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";
import { WaitlistForm } from "@/components/dashboard/WaitlistForm";
import { CheckoutButton } from "@/components/dashboard/CheckoutButton";
import { ManageBillingButton } from "@/components/dashboard/ManageBillingButton";
import { cn } from "@/lib/utils";
import { isProPlan, normalizePlanId } from "@/lib/config/plans";
import {
  isBillingConfigured,
  listConfiguredPrices,
} from "@/lib/billing/config";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const current = normalizePlanId(session.workspace.plan);
  const isPaid = isProPlan(current);
  const billingReady = isBillingConfigured();
  const proMonthly = listConfiguredPrices().find(
    (p) => p.plan === "pro" && p.interval === "month",
  );
  const showCheckout = billingReady && Boolean(proMonthly?.priceId);

  return (
    <PageStack>
      <PageHeader
        eyebrow={dict.dashboard.navAccount}
        title={dict.dashboard.billingTitle}
        description={dict.dashboard.billingBody}
      />

      <Panel
        title={dict.dashboard.currentPlan}
        description={
          isPaid
            ? dict.dashboard.billingBody
            : dict.dashboard.freeForever
        }
        action={
          <StatusBadge tone="accent">
            {current === "business"
              ? locale === "fa"
                ? "بیزنس"
                : "Business"
              : current === "pro"
                ? locale === "fa"
                  ? "حرفه‌ای"
                  : "Pro"
                : locale === "fa"
                  ? "شروع"
                  : "Starter"}
          </StatusBadge>
        }
      >
        <div className="space-y-4 px-5 py-5 text-sm text-muted-foreground">
          <p>
            {isPaid
              ? locale === "fa"
                ? "قابلیت‌های پلن پولی برای این ورک‌اسپیس فعال است."
                : "Paid-plan capabilities are active on this workspace."
              : dict.dashboard.freeForever}
          </p>
          {isPaid && billingReady ? (
            <ManageBillingButton locale={locale} />
          ) : null}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {pricing.plans.map((plan) => {
          const active =
            (plan.id === "free" && current === "free") ||
            (plan.id === "pro" && (current === "pro" || current === "business"));
          const featured = plan.featured;
          return (
            <article
              key={plan.id}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-white p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]",
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
                  {showCheckout && plan.id === "pro"
                    ? locale === "fa"
                      ? "حرفه‌ای"
                      : "Pro"
                    : plan.badge[locale]}
                </StatusBadge>
              </div>

              <p className="mt-5 font-display text-3xl tracking-tight text-ink">
                {plan.price === 0
                  ? locale === "fa"
                    ? "رایگان"
                    : "Free"
                  : showCheckout
                    ? locale === "fa"
                      ? "اشتراک"
                      : "Subscribe"
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
                  <Button
                    className="w-full"
                    variant={active ? "outline" : "default"}
                    disabled={active}
                  >
                    {active ? dict.dashboard.currentPlan : plan.cta[locale]}
                  </Button>
                ) : active ? (
                  billingReady ? (
                    <ManageBillingButton locale={locale} />
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {dict.dashboard.currentPlan}
                    </Button>
                  )
                ) : showCheckout && proMonthly ? (
                  <CheckoutButton
                    locale={locale}
                    priceId={proMonthly.priceId}
                    label={locale === "fa" ? "ارتقا" : "Upgrade"}
                  />
                ) : (
                  <WaitlistForm locale={locale} source="billing" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </PageStack>
  );
}
