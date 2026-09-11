import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { googleAuthAvailable } from "@/lib/auth/session";
import { turnstileRequired } from "@/lib/auth/turnstile";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const captchaRequired = turnstileRequired();
  return (
    <AuthShell dict={dict} locale={locale} mode="signup">
      <Suspense>
        <AuthForm
          mode="signup"
          dict={dict}
          locale={locale}
          googleEnabled={googleAuthAvailable()}
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
