"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import {
  IMPORT_POSTS_DEFAULT,
  importPostChoices,
} from "@/lib/config/import";

/**
 * Dedicated create step: choose how many Instagram posts to import.
 */
export function PostCountStep({
  dict,
  locale,
  url,
  maxPosts,
  forceRefresh = false,
}: {
  dict: Dictionary;
  locale: Locale;
  url: string;
  maxPosts: number;
  forceRefresh?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const choices = useMemo(() => importPostChoices(maxPosts), [maxPosts]);
  const initial = choices.includes(Math.min(IMPORT_POSTS_DEFAULT, maxPosts))
    ? Math.min(IMPORT_POSTS_DEFAULT, maxPosts)
    : choices[0]!;
  const [posts, setPosts] = useState(initial);
  const [submitting, setSubmitting] = useState(false);

  function continueWith(count: number) {
    setSubmitting(true);
    const params = new URLSearchParams({
      url,
      posts: String(count),
    });
    if (forceRefresh) params.set("refresh", "1");
    router.push(`/${locale}/create?${params.toString()}`);
  }

  return (
    <div className="relative mx-auto max-w-[560px] text-center">
      <motion.p
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="type-label text-accent"
      >
        {dict.brand}
      </motion.p>

      <motion.h1
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.04 }}
        className="mt-4 font-display tracking-[-0.04em]"
      >
        <span className="block text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.1] text-foreground-secondary">
          {dict.create.postsTitle}
        </span>
        <span className="mt-1 block text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.1] text-foreground">
          {dict.create.postsSubtitle}
        </span>
      </motion.h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.1 }}
        className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-7 text-foreground-muted"
      >
        {dict.create.postsBody}
      </motion.p>

      <p
        className="mt-5 truncate font-mono text-[12px] text-foreground-faint"
        dir="ltr"
        title={url}
      >
        {url}
      </p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.16 }}
        className="mt-8 rounded-2xl border border-border/70 bg-background/50 p-5 text-start sm:p-6"
        role="group"
        aria-label={dict.create.postsLabel}
      >
        <p className="text-[13px] font-medium text-foreground-secondary">
          {dict.create.postsLabel}
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-4">
          {choices.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPosts(n)}
              disabled={submitting}
              className={cn(
                "min-h-12 rounded-xl text-[15px] font-semibold tabular-nums transition",
                posts === n
                  ? "bg-accent text-[#080808] shadow-[0_0_0_1px_rgba(255,107,87,0.35)]"
                  : "bg-background text-foreground-secondary ring-1 ring-border hover:ring-border-strong",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] leading-5 text-foreground-muted">
          {dict.create.postsHint.replace("{max}", String(maxPosts))}
        </p>

        <Button
          type="button"
          variant="contrast"
          size="lg"
          className="mt-5 w-full"
          disabled={submitting}
          onClick={() => continueWith(posts)}
        >
          {submitting ? dict.create.startingTitle : dict.create.postsContinue}
        </Button>
      </motion.div>
    </div>
  );
}
