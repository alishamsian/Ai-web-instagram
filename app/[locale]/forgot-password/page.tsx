import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { turnstileRequired } from "@/lib/auth/turnstile";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const captchaRequired = turnstileRequired();
  return (
    <AuthShell dict={dict} locale={locale} mode="forgot">
      <Suspense>
        <ForgotPasswordForm
          dict={dict}
          locale={locale}
          turnstileSiteKey={
            captchaRequired
              ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "")
              : ""
          }
          captchaRequired={captchaRequired}
        />
      </Suspense>
    </AuthShell>
  );
}
