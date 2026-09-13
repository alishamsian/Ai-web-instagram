"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ImportProgress } from "@/components/import/ImportProgress";
import { InstagramInput } from "@/components/landing/InstagramInput";
import { IconInstagram } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { ImportJob } from "@/types/jobs";

type StartResult = {
  response: Response;
  data: ImportJob & { cached?: boolean; message?: string; error?: string };
};

function importStartCache() {
  const w = window as Window & {
    __vitrinImportPromises?: Map<string, Promise<StartResult>>;
  };
  w.__vitrinImportPromises ??= new Map();
  return w.__vitrinImportPromises;
}

export function CreateClient({
  locale,
  maxPosts = 10,
}: {
  locale: Locale;
  maxPosts?: number;
}) {
  const dict = getDictionary(locale);
  const search = useSearchParams();
  const router = useRouter();
  const url = search.get("url") ?? "";
  const postsParam = search.get("posts");
  const forceRefresh = search.get("refresh") === "1";
  const hasPostsChoice = Boolean(postsParam && Number(postsParam) > 0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "ready">(
    url && hasPostsChoice ? "starting" : "idle",
  );
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!url || !hasPostsChoice) return;
    let cancelled = false;
    const posts = Number(postsParam);
    const key = `${locale}|${url}|${posts}|${forceRefresh ? 1 : 0}`;
    const cache = importStartCache();

    if (!cache.has(key)) {
      cache.set(
        key,
        fetch("/api/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url,
            locale,
            forceRefresh,
            postsLimit: posts,
          }),
        }).then(async (response) => ({
          response,
          data: (await response.json()) as StartResult["data"],
        })),
      );
    }

    cache
      .get(key)!
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.status === 401) {
          cache.delete(key);
          const next = `/${locale}/create?url=${encodeURIComponent(url)}&posts=${posts}`;
          router.replace(
            `/${locale}/signup?next=${encodeURIComponent(next)}`,
          );
          return;
        }
        if (!response.ok) {
          cache.delete(key);
          setError(data.message ?? dict.errors.invalidUrl);
          setPhase("idle");
          return;
        }
        if (data.cached && data.websiteId) {
          setCached(true);
          router.replace(`/${locale}/editor/${data.websiteId}`);
          return;
        }
        setJobId(data.id);
        setPhase("ready");
      })
      .catch(() => {
        if (cancelled) return;
        cache.delete(key);
        setError(dict.errors.scrapeFailed);
        setPhase("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [
    url,
    postsParam,
    hasPostsChoice,
    locale,
    forceRefresh,
    dict.errors.invalidUrl,
    dict.errors.scrapeFailed,
    router,
  ]);

  if (cached) {
    return (
      <CreateShell solid>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg text-center"
        >
          <p className="type-label text-accent">{dict.brand}</p>
          <h1 className="type-display-m mt-4 text-balance text-foreground">
            {dict.importUi.fromCache}
          </h1>
          <div className="mx-auto mt-8 h-1 w-24 overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full bg-accent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </CreateShell>
    );
  }

  if (jobId) {
    const postsFromUrl = Number(postsParam);
    return (
      <ImportProgress
        jobId={jobId}
        locale={locale}
        postsLimit={
          Number.isFinite(postsFromUrl) && postsFromUrl > 0
            ? postsFromUrl
            : undefined
        }
      />
    );
  }

  if (phase === "starting" && url && hasPostsChoice) {
    return (
      <CreateShell solid>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md text-center"
        >
          <p className="type-label text-accent">{dict.brand}</p>
          <h1 className="type-display-m mt-4 text-balance text-foreground">
            {dict.create.startingTitle}
          </h1>
          <p className="mt-4 text-[15px] text-foreground-muted">
            {dict.create.startingBody}
          </p>
          <div className="mt-10 flex justify-center">
            <BuildingPulse />
          </div>
          <p
            className="mt-6 truncate font-mono text-[12px] text-foreground-faint"
            dir="ltr"
          >
            {url}
          </p>
        </motion.div>
      </CreateShell>
    );
  }

  return (
    <CreateShell>
      <div className="relative mx-auto max-w-[720px] text-center">
        <div
          className="pointer-events-none absolute start-1/2 top-[18%] size-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--mkt-glow)] blur-[100px]"
          aria-hidden
        />

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="type-label relative text-accent"
        >
          {dict.brand}
        </motion.p>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-4 font-display tracking-[-0.04em]"
        >
          <span className="block text-[clamp(2rem,6vw,3.5rem)] leading-[1.08] text-foreground-secondary">
            {url && !hasPostsChoice ? dict.create.postsTitle : dict.create.line1}
          </span>
          <span className="mt-1 block text-[clamp(2rem,6vw,3.5rem)] leading-[1.08] text-foreground md:mt-2">
            {url && !hasPostsChoice ? dict.create.postsSubtitle : dict.create.line2}
          </span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.12, duration: 0.45 }}
          className="relative mx-auto mt-5 max-w-lg text-pretty text-[15px] leading-7 text-foreground-muted md:mt-6 md:text-[16px] md:leading-8"
        >
          {url && !hasPostsChoice ? dict.create.postsBody : dict.create.body}
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : 0.2, duration: 0.5 }}
          className="relative z-20 mx-auto mt-8 max-w-xl text-start md:mt-10"
        >
          <InstagramInput
            dict={dict}
            locale={locale}
            defaultValue={url}
            maxPosts={maxPosts}
            ctaLabel={dict.hero.cta}
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-foreground-muted md:text-[13px]">
            <p>{dict.create.micro}</p>
            <Link
              href={`/${locale}/sites`}
              className="text-foreground-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {dict.create.sites}
            </Link>
          </div>
        </motion.div>

        {error ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="relative mx-auto mt-8 max-w-md text-center"
          >
            <p className="text-[14px] text-accent">{error}</p>
            <p className="mt-2 text-[13px] text-foreground-muted">{dict.errors.retry}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="contrast" size="lg">
                <a href={`/${locale}/create?url=instagram.com/demo&posts=6`}>
                  {dict.errors.useDemo}
                </a>
              </Button>
              <Button asChild variant="soft" size="lg">
                <a href={`/${locale}/create`}>{dict.errors.retry}</a>
              </Button>
            </div>
          </motion.div>
        ) : null}

        <motion.ol
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.35, duration: 0.6 }}
          className="relative mx-auto mt-14 flex max-w-md items-center justify-between gap-2 md:mt-20"
        >
          {dict.create.steps.map((step, i) => (
            <li key={step.n} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <span
                    className="h-px flex-1 bg-gradient-to-r from-transparent via-border-strong to-border-strong"
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                <span className="mx-1 inline-flex size-9 items-center justify-center rounded-full bg-accent/12 text-[11px] font-semibold tabular-nums text-accent ring-1 ring-accent/25 md:size-10 md:text-[12px]">
                  {step.n}
                </span>
                {i < dict.create.steps.length - 1 ? (
                  <span
                    className="h-px flex-1 bg-gradient-to-r from-border-strong via-border-strong to-transparent"
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>
              <span className="text-[12px] text-foreground-secondary md:text-[13px]">
                {step.label}
              </span>
            </li>
          ))}
        </motion.ol>
      </div>
    </CreateShell>
  );
}

function CreateShell({
  children,
  solid = false,
}: {
  children: ReactNode;
  solid?: boolean;
}) {
  return (
    <main className="relative overflow-hidden">
      {solid ? (
        <div className="fixed inset-0 z-0 bg-background" aria-hidden />
      ) : null}
      <div className="container-marketing relative z-[1] pb-20 pt-14 md:pb-28 md:pt-20 lg:pt-24">
        {children}
      </div>
    </main>
  );
}

function BuildingPulse() {
  return (
    <div className="relative flex size-16 items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-accent/30"
          animate={{ scale: [0.7, 1.55], opacity: [0.45, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.55,
            ease: "easeOut",
          }}
        />
      ))}
      <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
        <IconInstagram size={20} aria-hidden />
      </span>
    </div>
  );
}
