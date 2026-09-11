import Image from "next/image";
import { IconWebsite, ICON_SIZE } from "@/components/icons";
import { Section, SectionHeading } from "@/components/shared/section";
import { BrowserFrame, Reveal } from "@/components/shared/chrome";
import { Badge } from "@/components/ui/badge";
import { DEMO_POSTS } from "@/lib/demo/store";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

export function GeneratedWebsite({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const copy =
    locale === "fa"
      ? {
          hero: "لباس آرام برای شهر شلوغ.",
          about:
            "نوران پوشاک معاصر زنانه است — طراحی‌شده در تهران، با تمرکز روی برش دقیق و رنگ‌های آرام.",
          products: "محصولات",
          gallery: "گالری",
          contact: "تماس",
          proof: "ارسال به سراسر ایران · پاسخ در کمتر از یک روز",
          shop: "مشاهده مجموعه",
        }
      : {
          hero: "Quiet clothes for a loud city.",
          about:
            "Nooran is contemporary womenswear — designed in Tehran, focused on precise cuts and quiet color.",
          products: "Products",
          gallery: "Gallery",
          contact: "Contact",
          proof: "Ships nationwide · Replies within a day",
          shop: "Shop the collection",
        };

  return (
    <Section className="border-t border-border">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title={dict.generated.title} body={dict.generated.body} />
        <Badge tone="soft">
          <IconWebsite size={ICON_SIZE.sm} aria-hidden />
          {locale === "fa" ? "خروجی واقعی" : "Real output"}
        </Badge>
      </div>
      <Reveal className="mt-14">
        <BrowserFrame url="nooran.vitrin.app">
          <div className="bg-[#F4EFE8] text-start text-ink">
            <div className="border-b border-black/5 px-6 py-4 md:px-12">
              <div className="flex items-center justify-between text-xs tracking-[0.18em]">
                <span>NOORAN</span>
                <span className="hidden gap-8 text-[12px] tracking-normal text-muted-foreground sm:flex">
                  <span>{copy.products}</span>
                  <span>{copy.gallery}</span>
                  <span>{copy.contact}</span>
                </span>
              </div>
            </div>

            <div className="grid gap-10 px-6 py-12 md:grid-cols-[1.15fr_0.85fr] md:px-12 md:py-16">
              <div>
                <h3 className="font-display text-3xl leading-[1.08] md:text-5xl">{copy.hero}</h3>
                <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground md:text-base">
                  {copy.about}
                </p>
                <span className="mt-8 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm text-white">
                  {copy.shop}
                </span>
                <p className="mt-6 text-xs text-muted-foreground">{copy.proof}</p>
              </div>
              <Image
                src={DEMO_POSTS[0]?.displayUrl ?? ""}
                alt=""
                width={520}
                height={640}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>

            <div className="border-t border-black/5 px-6 py-10 md:px-12">
              <p className="text-xs tracking-[0.16em] text-muted-foreground">{copy.products}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {DEMO_POSTS.slice(1, 5).map((post) => (
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

            <div className="grid gap-8 border-t border-black/5 px-6 py-10 md:grid-cols-2 md:px-12">
              <div>
                <p className="text-xs tracking-[0.16em] text-muted-foreground">{copy.gallery}</p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {DEMO_POSTS.slice(5, 8).map((post) => (
                    <Image
                      key={post.id}
                      src={post.displayUrl ?? ""}
                      alt=""
                      width={180}
                      height={180}
                      className="aspect-square w-full object-cover"
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-end border border-black/10 bg-white/60 p-7">
                <p className="text-xs tracking-[0.16em] text-muted-foreground">{copy.contact}</p>
                <p className="mt-3 font-display text-2xl">@nooran.studio</p>
                <p className="mt-2 text-sm text-muted-foreground">hello@nooran.studio</p>
              </div>
            </div>
          </div>
        </BrowserFrame>
      </Reveal>
    </Section>
  );
}
