"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { TurnstileField } from "@/components/auth/TurnstileField";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function ResetPasswordForm({
  dict,
  locale,
  turnstileSiteKey = "",
}: {
  dict: Dictionary;
  locale: Locale;
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const onCaptcha = useCallback((token: string) => setCaptchaToken(token), []);

  async function onSubmit(formData: FormData) {
    setError("");
    setPending(true);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    if (password !== confirm) {
      setPending(false);
      setError(dict.auth.passwordMismatch);
      return;
    }
    if (turnstileSiteKey && !captchaToken) {
      setPending(false);
      setError(dict.auth.captchaRequired);
      return;
    }

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update-password",
        password,
        captchaToken: captchaToken || undefined,
      }),
    });
    setPending(false);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      isAdmin?: boolean;
    };
    if (!response.ok) {
      if (payload.error === "WEAK_PASSWORD") {
        setError(payload.message ?? dict.auth.weakPassword);
      } else if (payload.error === "UNAUTHORIZED") {
        setError(dict.auth.resetExpired);
      } else if (payload.error === "RATE_LIMITED") {
        setError(dict.auth.rateLimited);
      } else {
        setError(payload.message ?? dict.errors.scrapeFailed);
      }
      return;
    }
    router.replace(
      resolvePostLoginPath({
        locale,
        isAdmin: Boolean(payload.isAdmin),
      }),
    );
    router.refresh();
  }

  return (
    <form action={onSubmit} className="auth-form">
      <div className="auth-form__intro">
        <p className="auth-form__kicker">{dict.auth.savePassword}</p>
        <h1>{dict.auth.resetTitle}</h1>
        <p>{dict.auth.resetHint}</p>
      </div>

      <div className="auth-form__fields">
        <label className="auth-field">
          <span>{dict.auth.password}</span>
          <span className="auth-field__control">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? dict.auth.hidePassword : dict.auth.showPassword
              }
            >
              {showPassword ? (
                <EyeOff size={16} strokeWidth={1.75} />
              ) : (
                <Eye size={16} strokeWidth={1.75} />
              )}
            </button>
          </span>
          <em className="auth-hint">{dict.auth.passwordHint}</em>
        </label>

        <label className="auth-field">
          <span>{dict.auth.confirmPassword}</span>
          <input
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
      </div>

      {turnstileSiteKey ? (
        <TurnstileField siteKey={turnstileSiteKey} onToken={onCaptcha} />
      ) : null}

      {error ? (
        <p className="auth-msg auth-msg--error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="auth-btn auth-btn--primary" disabled={pending}>
        {pending ? "…" : dict.auth.savePassword}
      </button>
    </form>
  );
}
