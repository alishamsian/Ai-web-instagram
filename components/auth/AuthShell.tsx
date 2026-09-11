"use client";

import Link from "next/link";
import { BrandMark } from "@/components/landing/Brand";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function AuthShell({
  dict,
  locale,
  mode = "login",
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  mode?: "login" | "signup" | "forgot" | "reset";
  children: React.ReactNode;
}) {
  const steps = [
    dict.auth.visualStep1,
    dict.auth.visualStep2,
    dict.auth.visualStep3,
  ];

  return (
    <div className="auth-root" data-mode={mode}>
      <aside className="auth-stage" aria-hidden="false">
        <div className="auth-stage__glow auth-stage__glow--a" />
        <div className="auth-stage__glow auth-stage__glow--b" />
        <div className="auth-stage__grain" />

        <div className="auth-stage__top">
          <Link href={`/${locale}`} className="auth-stage__brand">
            <BrandMark className="text-white" />
            <span>{dict.brand}</span>
          </Link>
        </div>

        <div className="auth-stage__mid">
          <div className="auth-stage__copy">
            <p className="auth-stage__eyebrow">{dict.auth.stageEyebrow}</p>
            <h2 className="auth-stage__title">{dict.auth.visualTitle}</h2>
            <p className="auth-stage__body">{dict.auth.visualBody}</p>

            <ol className="auth-stage__steps">
              {steps.map((step, index) => (
                <li
                  key={step}
                  style={{ animationDelay: `${0.1 + index * 0.08}s` }}
                >
                  <span className="auth-stage__step-num">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="auth-stage__visual">
            <div className="auth-device auth-device--ig">
              <div className="auth-device__bar">
                <span />
                <span />
                <span />
              </div>
              <div className="auth-device__avatar" />
              <div className="auth-device__lines">
                <i />
                <i />
                <i />
              </div>
              <div className="auth-device__grid">
                <b />
                <b />
                <b />
                <b />
              </div>
            </div>

            <div className="auth-transform" aria-hidden>
              <span />
              <span />
              <span />
            </div>

            <div className="auth-device auth-device--site">
              <div className="auth-device__chrome">
                <em />
                <em />
                <em />
              </div>
              <div className="auth-device__hero" />
              <div className="auth-device__blocks">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="auth-panel">
        <header className="auth-panel__header">
          <Link href={`/${locale}`} className="auth-panel__brand">
            <BrandMark className="size-6" />
            <span>{dict.brand}</span>
          </Link>
          <Link href={`/${locale}`} className="auth-panel__home">
            {dict.auth.backHome}
          </Link>
        </header>

        <div className="auth-panel__body">
          <div className="auth-mobile-intro">
            <p className="auth-mobile-intro__eyebrow">{dict.auth.stageEyebrow}</p>
            <p className="auth-mobile-intro__title">{dict.auth.visualTitle}</p>
          </div>
          <div className="auth-panel__card">{children}</div>
        </div>
      </section>
    </div>
  );
}
