export const pricing = {
  currency: "IRT",
  plans: [
    {
      id: "free",
      name: { fa: "شروع", en: "Starter" },
      price: 0,
      period: { fa: "برای همیشه رایگان", en: "Free forever" },
      description: {
        fa: "از لینک اینستاگرام تا سایت زنده — بدون کارت بانکی.",
        en: "From Instagram link to a live site — no card required.",
      },
      cta: { fa: "شروع رایگان", en: "Start free" },
      featured: true,
      badge: { fa: "شروع از اینجا", en: "Start here" },
      features: {
        fa: [
          "ورود با لینک اینستاگرام",
          "ساخت سایت با هوش مصنوعی",
          "ویرایش رنگ، متن و بخش‌ها",
          "انتشار روی زیردامنه ویترین",
          "پیش‌نمایش دسکتاپ و موبایل",
        ],
        en: [
          "Import from Instagram URL",
          "AI-generated website",
          "Edit colors, copy, and sections",
          "Publish on a Vitrin subdomain",
          "Desktop & mobile preview",
        ],
      },
      limits: {
        fa: ["برند ویترین روی سایت", "تا ۴ سایت فعال", "تا ۱۰ پست در هر ورود"],
        en: ["Vitrin branding on site", "Up to 4 active sites", "Up to 10 posts per import"],
      },
    },
    {
      id: "pro",
      name: { fa: "حرفه‌ای", en: "Pro" },
      price: null,
      period: { fa: "قیمت به‌زودی", en: "Pricing soon" },
      description: {
        fa: "دامنه خودت، بدون برند ویترین، آمار و همگام‌سازی هوشمند.",
        en: "Your domain, no Vitrin brand, analytics, and smart sync.",
      },
      cta: { fa: "عضویت در لیست انتظار", en: "Join the waitlist" },
      featured: false,
      badge: { fa: "به‌زودی", en: "Coming soon" },
      features: {
        fa: [
          "همه‌چیز پلن شروع",
          "دامنه اختصاصی (به‌زودی در دسترس)",
          "حذف برند ویترین",
          "آمار بازدید پایه",
          "همگام‌سازی مجدد از اینستاگرام",
          "بخش‌ها و ویرایش پیشرفته",
          "اولویت در پشتیبانی",
        ],
        en: [
          "Everything in Starter",
          "Custom domain (available soon)",
          "Remove Vitrin branding",
          "Basic visit analytics",
          "Re-sync from Instagram",
          "Advanced sections & editing",
          "Priority support",
        ],
      },
      limits: {
        fa: ["برای برندهایی که جدی رشد می‌کنند"],
        en: ["Built for brands ready to grow"],
      },
    },
  ],
} as const;
