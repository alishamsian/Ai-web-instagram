import Image from "next/image";
import { Section, SectionHeading } from "@/components/shared/section";
import { BrowserFrame } from "@/components/shared/chrome";
import {
  DEMO_BEAUTY_IMAGES,
  DEMO_CREATOR_IMAGES,
  DEMO_POSTS,
  DEMO_RESTAURANT_IMAGES,
  DEMO_SERVICES_IMAGES,
} from "@/lib/demo/store";
import { templates, templateOrder } from "@/lib/website/templates";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

const previews: Record<string, { bg: string; fg: string; images: string[] }> = {
  store: {
    bg: "#F4EFE8",
    fg: "#1c1917",
    images: DEMO_POSTS.slice(0, 3).map((p) => p.displayUrl ?? ""),
  },
  restaurant: {
    bg: "#1a1410",
    fg: "#f5f1ea",
    images: DEMO_RESTAURANT_IMAGES.slice(0, 3),
  },
  services: {
    bg: "#fafafa",
    fg: "#111111",
    images: DEMO_SERVICES_IMAGES.slice(0, 3),
  },
  creator: {
    bg: "#0b0b0b",
    fg: "#f4f4f5",
    images: DEMO_CREATOR_IMAGES.slice(0, 3),
  },
  portfolio: {
    bg: "#ffffff",
    fg: "#18181b",
    images: DEMO_BEAUTY_IMAGES.slice(0, 3),
  },
};

export function Templates({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <Section>
      <SectionHeading title={dict.templates.title} body={dict.templates.body} />
      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {templateOrder.map((id) => {
          const preview = previews[id] ?? previews.store;
          return (
            <article key={id} className="min-w-0">
              <BrowserFrame url={`${id}.vitrin.app`} className="shadow-[var(--elevated)]">
                <div className="min-h-[220px] p-6" style={{ background: preview.bg, color: preview.fg }}>
                  <p className="text-[11px] tracking-[0.2em] opacity-70">
                    {templates[id].name[locale].toUpperCase()}
                  </p>
                  <p className="mt-3 font-display text-xl leading-snug md:text-2xl">
                    {templates[id].description[locale]}
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {preview.images.map((src) => (
                      <Image
                        key={src}
                        src={src}
                        alt=""
                        width={160}
                        height={160}
                        className="aspect-square w-full object-cover"
                      />
                    ))}
                  </div>
                </div>
              </BrowserFrame>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
