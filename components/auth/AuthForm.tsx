"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { TurnstileField } from "@/components/auth/TurnstileField";
import { safeAuthNext } from "@/lib/auth/redirect";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function AuthForm({
  mode,
  dict,
  locale,
  googleEnabled = false,
  demoEnabled = false,
  turnstileSiteKey = "",
  captchaRequired = false,
}: {
  mode: "login" | "signup";
  dict: Dictionary;
  locale: Locale;
  googleEnabled?: boolean;
  demoEnabled?: boolean;
  turnstileSiteKey?: string;
  captchaRequired?: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeAuthNext(search.get("next"), locale);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    if (mode === "signup") {
      const password = String(formData.get("password") ?? "");
      const confirm = String(formData.get("confirmPassword") ?? "");
      if (password !== confirm) {
        setPending(false);
        setError(dict.auth.passwordMismatch);
        return;
      }
    }

    let response: Response;
    try {
      response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: formData.get("email"),
          name: formData.get("name"),
          password: formData.get("password"),
          captchaToken: captchaToken || undefined,
        }),
      });
    } catch {
      setPending(false);
      setError(dict.auth.authFailed);
      return;
    }

    setPending(false);
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (response.status === 202 && payload.error === "CONFIRM_EMAIL") {
      setInfo(payload.message ?? dict.auth.confirmEmail);
      return;
    }

    if (!response.ok) {
      if (payload.error === "WEAK_PASSWORD") {
        setError(payload.message ?? dict.auth.weakPassword);
      } else if (payload.error === "EMAIL_TAKEN") {
        setError(dict.auth.emailTaken);
      } else if (payload.error === "INVALID_CREDENTIALS") {
        setError(dict.auth.invalidCredentials);
      } else if (payload.error === "RATE_LIMITED") {
        setError(dict.auth.rateLimited);
      } else if (
        payload.error === "CAPTCHA_REQUIRED" ||
        payload.error === "CAPTCHA_FAILED"
      ) {
        setError(dict.auth.captchaRequired);
      } else if (payload.error === "SUPABASE_REQUIRED") {
        setError(dict.auth.configRequired);
      } else {
        setError(payload.message ?? dict.auth.authFailed);
      }
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function onDemo() {
    if (!demoEnabled) return;
    setError("");
    setPending(true);
    let response: Response;
    try {
      response = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "demo" }),
      });
    } catch {
      setPending(false);
      setError(dict.auth.authFailed);
      return;
    }
    setPending(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setError(payload.message ?? dict.auth.authFailed);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function onGoogle() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
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
        <p className="auth-form__kicker">
          {mode === "login" ? dict.auth.welcomeBack : dict.auth.createAccount}
        </p>
        <h1>{mode === "login" ? dict.auth.loginTitle : dict.auth.signupTitle}</h1>
        <p>{dict.auth.hint}</p>
      </div>

      {googleEnabled ? (
        <>
          <button
            type="button"
            className="auth-btn auth-btn--google"
            disabled={pending}
            onClick={() => void onGoogle()}
          >
            <GoogleGlyph />
            {dict.auth.google}
          </button>
          <div className="auth-divider" role="separator">
            <span>{dict.auth.or}</span>
          </div>
        </>
      ) : null}

      <div className="auth-form__fields">
        {mode === "signup" ? (
          <label className="auth-field">
            <span>{dict.auth.name}</span>
            <input name="name" autoComplete="name" placeholder=" " />
          </label>
        ) : null}

        <label className="auth-field">
          <span>{dict.auth.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder=" "
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__row">
            {dict.auth.password}
            {mode === "login" ? (
              <Link href={`/${locale}/forgot-password`}>
                {dict.auth.forgotPassword}
              </Link>
            ) : null}
          </span>
          <span className="auth-field__control">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder=" "
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
          {mode === "signup" ? (
            <em className="auth-hint">{dict.auth.passwordHint}</em>
          ) : null}
        </label>

        {mode === "signup" ? (
          <label className="auth-field">
            <span>{dict.auth.confirmPassword}</span>
            <span className="auth-field__control">
              <input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder=" "
              />
            </span>
          </label>
        ) : null}
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
        {pending ? (
          <>
            <Loader2 size={16} className="auth-spin" />
            {dict.auth.submitting}
          </>
        ) : mode === "login" ? (
          dict.auth.submitLogin
        ) : (
          dict.auth.submitSignup
        )}
      </button>

      {mode === "login" && demoEnabled ? (
        <button
          type="button"
          className="auth-btn auth-btn--text"
          disabled={pending}
          onClick={() => void onDemo()}
        >
          {dict.auth.demo}
        </button>
      ) : null}

      <p className="auth-switch">
        {mode === "login" ? dict.auth.noAccount : dict.auth.hasAccount}{" "}
        <Link
          href={`/${locale}/${mode === "login" ? "signup" : "login"}?next=${encodeURIComponent(next)}`}
        >
          {mode === "login" ? dict.auth.switchSignup : dict.auth.switchLogin}
        </Link>
      </p>
    </form>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 7.24v3.54h4.94c-.22 1.14-.88 2.1-1.88 2.74v2.28h3.04c1.78-1.64 2.8-4.06 2.8-6.92 0-.66-.06-1.3-.16-1.92H9z"
      />
      <path
        fill="#34A853"
        d="M9 17c2.54 0 4.68-.84 6.24-2.28l-3.04-2.28c-.84.56-1.92.9-3.2.9-2.46 0-4.54-1.66-5.28-3.9H.6v2.36C2.14 15.14 5.32 17 9 17z"
      />
      <path
        fill="#4A90E2"
        d="M3.72 10.34A5.13 5.13 0 0 1 3.44 9c0-.46.08-.92.22-1.34V5.3H.6A8.97 8.97 0 0 0 0 9c0 1.46.34 2.84.6 3.7l3.12-2.36z"
      />
      <path
        fill="#FBBC05"
        d="M9 3.58c1.38 0 2.62.48 3.6 1.42l2.7-2.7C13.66.88 11.54 0 9 0 5.32 0 2.14 1.86.6 5.3l3.12 2.36C4.46 5.24 6.54 3.58 9 3.58z"
      />
    </svg>
  );
}
