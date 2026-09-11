"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ICON_SIZE,
  IconAI,
  IconAnalyzing,
  IconInstagram,
  IconWebsite,
} from "@/components/icons";
import { BrowserFrame, Reveal } from "@/components/shared/chrome";
import { InstagramPreview } from "@/components/shared/InstagramPreview";
import { Section, SectionHeading } from "@/components/shared/section";
import { DEMO_POSTS } from "@/lib/demo/store";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

const STAGES = ["profile", "analyzing", "website"] as const;

export function SignatureTransform({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const [stage, setStage] = useState<(typeof STAGES)[number]>("profile");
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      setStage((current) => STAGES[(STAGES.indexOf(current) + 1) % STAGES.length]);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const meta = {
    profile: {
      label: locale === "fa" ? "اینستاگرام" : "Instagram",
      icon: IconInstagram,
      ai: false,
    },
    analyzing: {
      label: locale === "fa" ? "فهم برند" : "Understanding",
      icon: IconAI,
      ai: true,
    },
    website: {
      label: locale === "fa" ? "وب‌سایت" : "Website",
      icon: IconWebsite,
      ai: false,
    },
  } as const;

  const insights = [
    {
      label: locale === "fa" ? "کسب‌وکار" : "Business",
      value: locale === "fa" ? "برند مد" : "Fashion brand",
    },
    {
      label: locale === "fa" ? "شخصیت" : "Personality",
      value: locale === "fa" ? "مینیمال · پریمیوم · مدرن" : "Minimal · Premium · Modern",
    },
    {
      label: locale === "fa" ? "رنگ‌ها" : "Colors",
      value: locale === "fa" ? "مشکی · بژ · سفید" : "Black · Beige · White",
      swatches: ["#111111", "#E8DFD3", "#FFFFFF"],
    },
    {
      label: locale === "fa" ? "محتوا" : "Content",
      value: locale === "fa" ? "محصول · سبک زندگی · داستان" : "Product · Lifestyle · Story",
    },
    {
      label: locale === "fa" ? "ساختار سایت" : "Site structure",
      value: "Hero · Products · About · Gallery · Contact",
    },
  ];

  return (
    <Section id="how">
      <div className="flex flex-col gap-10 md:gap-14">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading title={dict.transform.title} body={dict.transform.body} />
          <div
            className="story-rail"
            role="tablist"
            aria-label={locale === "fa" ? "مراحل تبدیل" : "Transformation stages"}
          >
            {STAGES.map((item, index) => {
              const Icon = meta[item].icon;
              const active = stage === item;
              return (
                <div key={item} className="contents">
                  {index > 0 ? (
                    <ArrowDown
                      size={14}
                      className="story-rail__arrow -rotate-90 rtl:rotate-90"
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active ? "true" : "false"}
                    data-ai={meta[item].ai ? "true" : undefined}
                    onClick={() => setStage(item)}
                    className="story-rail__step"
                  >
                    <span
                      className={cn(
                        "icon-tile size-7",
                        meta[item].ai && active && "icon-tile--ai",
                      )}
                    >
                      <Icon size={14} aria-hidden />
                    </span>
                    {meta[item].label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <Reveal>
          <BrowserFrame url="nooran.vitrin.app" className="overflow-hidden">
            <div className="relative min-h-[460px] md:min-h-[520px]">
              <AnimatePresence mode="wait">
                {stage === "profile" ? (
                  <motion.div
                    key="profile"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    className="grid min-h-[460px] md:min-h-[520px] md:grid-cols-[320px_1fr]"
                  >
                    <div className="border-e border-border bg-white">
                      <InstagramPreview locale={locale} />
                    </div>
                    <div className="hidden items-center justify-center bg-[#fafafa] p-10 md:flex">
                      <div className="max-w-sm text-start">
                        <span className="icon-tile">
                          <IconInstagram size={ICON_SIZE.md} aria-hidden />
                        </span>
                        <p className="mt-5 text-sm text-muted-foreground">
                          {locale === "fa" ? "ورودی محصول" : "Product input"}
                        </p>
                        <p className="mt-3 font-display text-3xl leading-tight text-ink">
                          {locale === "fa"
                            ? "همان پیج، همان برند."
                            : "Same profile. Same brand."}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {stage === "analyzing" ? (
                  <motion.div
                    key="analyzing"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    className="grid min-h-[460px] gap-0 md:min-h-[520px] md:grid-cols-2"
                  >
                    <div className="grid grid-cols-3 gap-px border-e border-border bg-border">
                      {DEMO_POSTS.slice(0, 6).map((post) => (
                        <Image
                          key={post.id}
                          src={post.displayUrl ?? ""}
                          alt=""
                          width={240}
                          height={300}
                          className="aspect-[4/5] h-full w-full bg-white object-cover"
                        />
                      ))}
                    </div>
                    <div className="flex flex-col justify-center gap-2.5 bg-white p-6 md:p-10">
                      <div className="mb-2 flex items-center gap-2 text-ai">
                        <span className="icon-tile icon-tile--ai size-8">
                          <IconAnalyzing size={15} aria-hidden />
                        </span>
                        <span className="text-xs font-medium tracking-wide">
                          {locale === "fa" ? "در حال فهم برند" : "Reading the brand"}
                        </span>
                      </div>
                      {insights.map((item, index) => (
                        <motion.div
                          key={item.label}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08 }}
                          className="border-b border-border py-3 text-start last:border-b-0"
                        >
                          <p className="text-[11px] text-muted-foreground">{item.label}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <p className="text-sm font-medium">{item.value}</p>
                            {item.swatches ? (
                              <span className="ms-auto flex gap-1">
                                {item.swatches.map((c) => (
                                  <span
                                    key={c}
                                    className="size-3 rounded-full border border-border"
                                    style={{ background: c }}
                                    aria-hidden
                                  />
                                ))}
                              </span>
                            ) : null}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}

                {stage === "website" ? (
                  <motion.div
                    key="website"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    className="min-h-[460px] bg-[#F4EFE8] text-start md:min-h-[520px]"
                  >
                    <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 md:px-12">
                      <span className="text-xs tracking-[0.2em]">NOORAN</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <IconWebsite size={14} aria-hidden />
                        Shop · About · Contact
                      </span>
                    </div>
                    <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:py-14">
                      <div>
                        <h3 className="font-display text-3xl leading-[1.08] md:text-5xl">
                          {locale === "fa"
                            ? "لباس آرام برای شهر شلوغ."
                            : "Quiet clothes for a loud city."}
                        </h3>
                        <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
                          {locale === "fa"
                            ? "همان تصاویر و لحن اینستاگرام — حالا روی وب."
                            : "The same Instagram imagery and tone — now on the web."}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {DEMO_POSTS.slice(0, 4).map((post) => (
                          <Image
                            key={post.id}
                            src={post.displayUrl ?? ""}
                            alt=""
                            width={240}
                            height={300}
                            className="aspect-[4/5] w-full object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </BrowserFrame>
        </Reveal>
      </div>
    </Section>
  );
}
