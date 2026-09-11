import Image from "next/image";
import {
  ICON_SIZE,
  IconAnalytics,
  IconCopy,
  IconDomain,
  IconMobile,
  IconPhotos,
  IconSEO,
} from "@/components/icons";
import { Section, SectionHeading } from "@/components/shared/section";
import { BrowserFrame, PhoneMockup, Reveal } from "@/components/shared/chrome";
import { DEMO_POSTS } from "@/lib/demo/store";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";

const visualIcons = {
  domain: IconDomain,
  copy: IconCopy,
  photos: IconPhotos,
  mobile: IconMobile,
  seo: IconSEO,
  analytics: IconAnalytics,
} as const;

function FeatureVisual({ kind }: { kind: string }) {
  if (kind === "domain") {
    return (
      <BrowserFrame url="yourbrand.com" className="shadow-none">
        <div className="bg-white px-6 py-10 text-start md:px-8">
          <span className="icon-tile">
            <IconDomain size={ICON_SIZE.md} aria-hidden />
          </span>
          <p className="mt-5 text-xs tracking-[0.2em] text-muted-foreground">YOUR BRAND</p>
          <p className="mt-4 font-display text-2xl text-ink md:text-3xl">A real address on the web.</p>
          <div className="mt-8 h-px w-full bg-border" />
          <p className="mt-4 text-sm text-muted-foreground">not just a link in bio</p>
        </div>
      </BrowserFrame>
    );
  }

  if (kind === "copy") {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-start md:p-8">
        <span className="icon-tile icon-tile--ai">
          <IconCopy size={ICON_SIZE.md} aria-hidden />
        </span>
        <p className="mt-4 text-[11px] text-muted-foreground">Generated from Instagram</p>
        <p className="mt-4 font-display text-2xl leading-snug text-ink md:text-3xl">
          Quiet clothes for a loud city.
        </p>
        <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
          Contemporary womenswear — precise cuts, calm color, designed in Tehran.
        </p>
        <div className="mt-6 inline-flex rounded-md bg-ink px-4 py-2 text-sm text-white">
          Shop the collection
        </div>
      </div>
    );
  }

  if (kind === "photos") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {DEMO_POSTS.slice(0, 6).map((post) => (
          <Image
            key={post.id}
            src={post.displayUrl ?? ""}
            alt=""
            width={220}
            height={260}
            className="aspect-[4/5] w-full object-cover"
          />
        ))}
      </div>
    );
  }

  if (kind === "seo") {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-start md:p-8">
        <span className="icon-tile">
          <IconSEO size={ICON_SIZE.md} aria-hidden />
        </span>
        <p className="mt-4 text-[11px] text-muted-foreground">SEO</p>
        <div className="mt-5 space-y-4">
          {[
            { label: "Title", value: "Nooran — Contemporary womenswear" },
            { label: "Description", value: "Quiet clothes for a loud city." },
            { label: "URL", value: "yourbrand.com" },
          ].map((row) => (
            <div key={row.label} className="border-b border-border pb-3">
              <p className="text-[11px] text-muted-foreground">{row.label}</p>
              <p className="mt-1 text-sm font-medium">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "analytics") {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-start md:p-8">
        <span className="icon-tile">
          <IconAnalytics size={ICON_SIZE.md} aria-hidden />
        </span>
        <p className="mt-4 text-[11px] text-muted-foreground">Last 7 days</p>
        <p className="mt-4 font-display text-4xl text-ink">1,284</p>
        <p className="mt-1 text-sm text-muted-foreground">visits</p>
        <div className="mt-8 flex items-end gap-2">
          {[40, 55, 35, 70, 48, 82, 64].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-ink/10"
              style={{ height: `${h}px` }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PhoneMockup>
      <div className="bg-[#F4EFE8] p-4 text-start">
        <p className="text-[10px] tracking-[0.18em] text-muted-foreground">NOORAN</p>
        <p className="mt-3 font-display text-lg leading-snug">Quiet clothes for a loud city.</p>
        <Image
          src={DEMO_POSTS[1]?.displayUrl ?? ""}
          alt=""
          width={220}
          height={260}
          className="mt-4 aspect-[4/5] w-full object-cover"
        />
      </div>
    </PhoneMockup>
  );
}

export function Features({ dict }: { dict: Dictionary }) {
  return (
    <Section className="border-t border-border">
      <SectionHeading title={dict.features.title} />
      <div className="mt-14 space-y-14 md:mt-20 md:space-y-28">
        {/* Mobile: horizontal snap cards */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dict.features.stories.map((story, index) => {
            const Icon = visualIcons[story.visual as keyof typeof visualIcons] ?? IconDomain;
            return (
              <article
                key={story.title}
                className="w-[min(85vw,22rem)] shrink-0 snap-center"
              >
                <div className="flex items-center gap-3">
                  <span className="icon-tile">
                    <Icon size={ICON_SIZE.md} aria-hidden />
                  </span>
                  <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                </div>
                <h3 className="mt-4 font-display text-2xl leading-tight text-ink">
                  {story.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{story.body}</p>
                <div className="mt-6">
                  <FeatureVisual kind={story.visual} />
                </div>
              </article>
            );
          })}
        </div>

        <div className="hidden space-y-20 md:block md:space-y-28">
        {dict.features.stories.map((story, index) => {
          const reverse = index % 2 === 1;
          const Icon = visualIcons[story.visual as keyof typeof visualIcons] ?? IconDomain;
          return (
            <Reveal key={story.title}>
              <article
                className={cn(
                  "grid items-center gap-12 lg:grid-cols-2 lg:gap-20",
                  reverse && "lg:[&>*:first-child]:order-2",
                )}
              >
                <div className="max-w-md">
                  <div className="flex items-center gap-3">
                    <span className="icon-tile">
                      <Icon size={ICON_SIZE.md} aria-hidden />
                    </span>
                    <p className="text-[11px] tracking-[0.16em] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                  </div>
                  <h3 className="mt-4 font-display text-3xl leading-tight text-ink md:text-4xl">
                    {story.title}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">{story.body}</p>
                </div>
                <div className={cn(reverse ? "lg:justify-self-start" : "lg:justify-self-end")}>
                  <FeatureVisual kind={story.visual} />
                </div>
              </article>
            </Reveal>
          );
        })}
        </div>
      </div>
    </Section>
  );
}
