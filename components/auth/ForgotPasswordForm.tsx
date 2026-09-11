"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { TurnstileField } from "@/components/auth/TurnstileField";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function ForgotPasswordForm({
  dict,
  locale,
  turnstileSiteKey = "",
  captchaRequired = false,
}: {
  dict: Dictionary;
  locale: Locale;
  turnstileSiteKey?: string;
  captchaRequired?: boolean;
}) {
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const onCaptcha = useCallback((token: string) => setCaptchaToken(token), []);
  const showCaptcha = captchaRequired && Boolean(turnstileSiteKey);

  async function submit(formData: FormData) {
    setError("");
    setInfo("");
    setPending(true);
    if (showCaptcha && !captchaToken) {
      setPending(false);
      setError(dict.auth.captchaRequired);
      return;
    }
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "forgot-password",
        email: formData.get("email"),
        captchaToken: captchaToken || undefined,
      }),
    });
    setPending(false);
    if (response.status === 429) {
      setError(dict.auth.rateLimited);
      return;
    }
    setInfo(dict.auth.resetSent);
  }

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <div className="auth-form__intro">
        <p className="auth-form__kicker">{dict.auth.forgotPassword}</p>
        <h1>{dict.auth.forgotTitle}</h1>
        <p>{dict.auth.forgotHint}</p>
      </div>

      <div className="auth-form__fields">
        <label className="auth-field">
          <span>{dict.auth.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
          />
        </label>
      </div>

      {showCaptcha ? (
        <TurnstileField siteKey={turnstileSiteKey} onToken={onCaptcha} />
      ) : null}

      {error ? (
        <p className="auth-msg auth-msg--error" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="auth-msg auth-msg--ok" role="status">
          {info}
        </p>
      ) : null}

      <button type="submit" className="auth-btn auth-btn--primary" disabled={pending}>
        {pending ? "…" : dict.auth.sendReset}
      </button>

      <p className="auth-switch">
        <Link href={`/${locale}/login`}>{dict.auth.switchLogin}</Link>
      </p>
    </form>
  );
}
