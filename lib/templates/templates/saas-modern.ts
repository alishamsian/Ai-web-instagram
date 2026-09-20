import { BRAND_MODERN } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const saasModernTemplate = defineTemplate({
  id: "saas-modern",
  slug: "saas-modern",
  name: { fa: "سااس مدرن", en: "SaaS Modern" },
  description: {
    fa: "محصول نرم‌افزاری با فیچر، قیمت‌گذاری و تماس.",
    en: "Software product site with features, pricing, and contact.",
  },
  category: "saas",
  style: "modern",
  tags: ["saas", "product", "pricing"],
  features: ["pricing", "contact-form", "testimonials"],
  legacyTemplate: "services",
  brand: BRAND_MODERN,
  metadata: { industry: "saas", businessTypes: ["saas"] },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "split",
        canonical: true,
        content: {
          headline: { fa: "گردش‌کارهای بهتر بسازید", en: "Build better workflows" },
          subheadline: { fa: "سایت محصول آرام برای تیم‌هایی که می‌سازند.", en: "A calm product site for teams that ship." },
          cta: { fa: "شروع رایگان", en: "Start free" },
        },
      }),
      sec("services", "section-services", {
        canonical: true,
        content: { title: { fa: "کاوش امکانات", en: "Explore features" } },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "cards",
        content: { title: { fa: "مورد اعتماد تیم‌ها", en: "Trusted by teams" } },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: { fa: "امروز رایگان شروع کنید", en: "Start free today" }, cta: { fa: "ساخت حساب", en: "Create account" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("features", "features", { fa: "قابلیت‌ها", en: "Features" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "امکانات", en: "Features" },
          subheadline: { fa: "هر آنچه برای سریع‌تر حرکت کردن لازم دارید.", en: "Everything you need to move faster." },
          cta: { fa: "مشاهده قیمت‌ها", en: "See pricing" },
        },
      }),
      sec("services", "section-services", {
        content: { title: { fa: "توانمندی‌های محصول", en: "Product capabilities" } },
      }),
      sec("faq", "section-faq", { content: { title: { fa: "سوالات متداول", en: "FAQ" } } }),
      sec("footer", "section-footer"),
    ]),
    page("pricing", "pricing", { fa: "قیمت", en: "Pricing" }, "custom", [
      sec("hero", "section-hero", {
        variant: "centered",
        content: {
          headline: { fa: "قیمت‌گذاری ساده", en: "Simple pricing" },
          subheadline: { fa: "رایگان شروع کنید. وقتی رشد کردید ارتقا دهید.", en: "Start free. Upgrade when you grow." },
          cta: { fa: "مقایسه پلن‌ها", en: "Compare plans" },
        },
      }),
      sec("pricing", "section-pricing", {
        content: { title: { fa: "قیمت‌گذاری", en: "Pricing" } },
      }),
      sec("cta", "section-cta", {
        variant: "full-width",
        content: { title: { fa: "هر وقت آماده باشید", en: "Ready when you are" }, cta: { fa: "شروع رایگان", en: "Start free" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "درباره محصول", en: "About the product" },
          body: { fa: "ابزارهای متمرکز برای اپراتورهایی که وضوح را به شلوغی ترجیح می‌دهند.", en: "We build focused tools for operators who care about clarity over clutter." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "با ما صحبت کنید", en: "Talk to us" },
          body: { fa: "فروش، پشتیبانی و همکاری.", en: "Sales, support, and partnerships." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
