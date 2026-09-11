import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { googleAuthAvailable } from "@/lib/auth/session";
import { turnstileRequired } from "@/lib/auth/turnstile";
import { allowDemoAuth } from "@/lib/config/runtime";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const captchaRequired = turnstileRequired();
  return (
    <AuthShell dict={dict} locale={locale} mode="login">
      <Suspense>
        <AuthForm
          mode="login"
          dict={dict}
          locale={locale}
          googleEnabled={googleAuthAvailable()}
          demoEnabled={allowDemoAuth()}
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
