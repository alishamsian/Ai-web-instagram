import { BRAND_REAL_ESTATE } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const realEstateTemplate = defineTemplate({
  id: "real-estate",
  slug: "real-estate",
  name: { fa: "املاک", en: "Real Estate" },
  description: {
    fa: "خانه، ملک‌ها، درباره و تماس برای مشاور املاک.",
    en: "Home, listings, about, and contact for property advisors.",
  },
  category: "real-estate",
  style: "corporate",
  tags: ["real-estate", "property", "listings"],
  features: ["gallery", "contact-form", "testimonials"],
  legacyTemplate: "services",
  brand: BRAND_REAL_ESTATE,
  metadata: {
    industry: "real-estate",
    businessTypes: ["real-estate"],
  },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "split",
        canonical: true,
        content: {
          headline: { fa: "خانه‌هایی با حضور", en: "Homes with presence" },
          subheadline: { fa: "آگهی‌های گزیده و راهنمایی آرام در هر مرحله.", en: "Curated listings and calm guidance through every step." },
          cta: { fa: "مشاهده املاک", en: "View properties" },
        },
      }),
      sec("featured", "section-featured-products", {
        content: { title: { fa: "خانه‌های ویژه", en: "Featured homes" } },
      }),
      sec("about", "section-about", {
        canonical: true,
        content: {
          title: { fa: "مشاوره", en: "Advisory" },
          body: { fa: "به خریدار و فروشنده کمک می‌کنیم با وضوح حرکت کنند — آگهی کمتر، تناسب بهتر.", en: "We help buyers and sellers move with clarity — fewer listings, better fits." },
        },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "cards",
        content: { title: { fa: "داستان مشتریان", en: "Client stories" } },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: { fa: "آماده صحبتید؟", en: "Ready to talk?" }, cta: { fa: "تماس با مشاور", en: "Contact an advisor" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page(
      "properties",
      "properties",
      { fa: "ملک‌ها", en: "Properties" },
      "custom",
      [
        sec("hero", "section-hero", {
          variant: "minimal",
          content: {
            headline: { fa: "املاک", en: "Properties" },
            subheadline: { fa: "آگهی‌های فعال و بازدید خصوصی.", en: "Active listings and private viewings." },
            cta: { fa: "درخواست بازدید", en: "Request a tour" },
          },
        }),
        sec("properties", "section-properties", {
          content: { title: { fa: "آگهی‌ها", en: "Listings" } },
        }),
        sec("gallery", "section-gallery", { content: { title: { fa: "گالری‌ها", en: "Galleries" } } }),
        sec("footer", "section-footer"),
      ],
    ),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "درباره دفتر", en: "About the practice" },
          body: { fa: "استودیوی متمرکز املاک برای خانه‌های شهری و حومه آرام.", en: "A focused real-estate studio for city homes and quiet suburbs." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "تماس", en: "Contact" },
          body: { fa: "خرید، فروش و استعلام قیمت‌گذاری.", en: "Buying, selling, and valuation inquiries." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
