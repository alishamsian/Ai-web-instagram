import { BRAND_PREMIUM_SOFT } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const beautyPremiumTemplate = defineTemplate({
  id: "beauty-premium",
  slug: "beauty-premium",
  name: { fa: "زیبایی پریمیوم", en: "Beauty Premium" },
  description: {
    fa: "خدمات، محصولات و داستان برند برای فضای زیبایی.",
    en: "Services, products, and brand story for beauty spaces.",
  },
  category: "beauty",
  style: "elegant",
  tags: ["beauty", "care", "services"],
  features: ["ecommerce", "gallery", "testimonials", "contact-form"],
  legacyTemplate: "store",
  brand: BRAND_PREMIUM_SOFT,
  metadata: { industry: "beauty", businessTypes: ["beauty", "fashion"] },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "overlay",
        canonical: true,
        content: {
          headline: { fa: "مراقبت، با روایت آرام", en: "Care, calmly presented" },
          subheadline: { fa: "روتین و درمان با مسیر روشن.", en: "Routines and treatments with a clear path." },
          cta: { fa: "کاوش مراقبت", en: "Explore care" },
        },
      }),
      sec("services", "section-services", {
        content: { title: { fa: "خدمات", en: "Services" } },
      }),
      sec("featured", "section-featured-products", {
        content: { title: { fa: "محصولات ویژه", en: "Featured products" } },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "cards",
        content: { title: { fa: "یادداشت مشتریان", en: "Client notes" } },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        content: { title: { fa: "رزرو مشاوره", en: "Book a consultation" }, cta: { fa: "در تماس باشید", en: "Get in touch" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("services", "services", { fa: "خدمات", en: "Services" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "خدمات", en: "Services" },
          subheadline: { fa: "فیشیال، آیین‌ها و مراقبت فصلی.", en: "Facials, rituals, and seasonal care." },
          cta: { fa: "رزرو", en: "Book" },
        },
      }),
      sec("services", "section-services"),
      sec("faq", "section-faq", { content: { title: { fa: "قبل از مراجعه", en: "Before you visit" } } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "رویکرد ما", en: "Our approach" },
          body: { fa: "فرمول‌های ملایم، راهنمایی صادقانه و فضای آرام استودیو.", en: "Gentle formulas, honest guidance, and a quiet studio atmosphere." },
        },
      }),
      sec("gallery", "section-gallery", { content: { title: { fa: "استودیو", en: "Studio" } } }),
      sec("footer", "section-footer"),
    ]),
    page("products", "products", { fa: "محصولات", en: "Products" }, "custom", [
      sec("hero", "section-hero", {
        variant: "split",
        content: {
          headline: { fa: "محصولات", en: "Products" },
          subheadline: { fa: "مراقبت خانگی هم‌راستا با آیین استودیو.", en: "Home care that matches the studio ritual." },
          cta: { fa: "فروشگاه", en: "Shop" },
        },
      }),
      sec("products", "section-products", { content: { title: { fa: "مجموعه مراقبت", en: "Care collection" } } }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "بازدید و تماس", en: "Visit & contact" },
          body: { fa: "نوبت، سوال محصول و همکاری.", en: "Appointments, product questions, and collaborations." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
