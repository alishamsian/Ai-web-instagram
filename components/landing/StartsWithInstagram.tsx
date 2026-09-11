import {
  IconInstagram,
  IconPersonality,
  IconProducts,
  IconVisualStyle,
  ICON_SIZE,
} from "@/components/icons";
import { Section, SectionHeading } from "@/components/shared/section";
import { PhoneMockup, Reveal } from "@/components/shared/chrome";
import { InstagramPreview } from "@/components/shared/InstagramPreview";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

const pointIcons = [IconInstagram, IconProducts, IconPersonality, IconVisualStyle] as const;

export function StartsWithInstagram({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <Section className="border-t border-border">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_280px] lg:gap-20">
        <Reveal>
          <SectionHeading title={dict.startsWith.title} />
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {dict.startsWith.points.map((point, index) => {
              const Icon = pointIcons[index] ?? IconInstagram;
              return (
                <div key={point.title} className="border-t border-border pt-5">
                  <span className="icon-tile">
                    <Icon size={ICON_SIZE.md} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg text-ink md:text-xl">{point.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{point.body}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
        <Reveal delay={0.05} className="justify-self-center">
          <PhoneMockup>
            <InstagramPreview locale={locale} />
          </PhoneMockup>
        </Reveal>
      </div>
    </Section>
  );
}
