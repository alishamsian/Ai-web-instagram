import type { AIAnalyzer, WebsiteAIAnalysis } from "@/types/ai";
import type { InstagramPost, InstagramProfile } from "@/types/instagram";
import type { TemplateType } from "@/types/website";

const DEMO_ANALYSIS: WebsiteAIAnalysis = {
  businessType: "fashion_store",
  businessName: "نوران",
  summary:
    "برند پوشاک معاصر زنانه در تهران که لباس‌های روزمره و رسمی را با برش دقیق و پارچه‌های طبیعی طراحی می‌کند.",
  targetAudience: "زنان ۲۳ تا ۴۰ ساله که دنبال لباس باکیفیت، ساده و شهری هستند",
  brandTone: ["modern", "calm", "premium", "editorial"],
  visualStyle: ["neutral", "natural-light", "minimal", "film"],
  suggestedColors: ["#1C1917", "#F5F0EA", "#B08968", "#FFFFFF"],
  products: [
    {
      name: "کت لینن بژ",
      description: "کت سبک با پارچه لینن، مناسب بهار و روزهای شهری.",
      category: "کت",
      price: null,
      currency: null,
      imageIds: ["n01"],
      confidence: 0.92,
    },
    {
      name: "پیراهن ساتن مشکی",
      description: "پیراهن شب با برش ساده و پارچه ساتن.",
      category: "پیراهن",
      price: null,
      currency: null,
      imageIds: ["n03"],
      confidence: 0.9,
    },
    {
      name: "کیف چرم دستی",
      description: "کیف دست‌دوز در رنگ عسلی و مشکی.",
      category: "اکسسوری",
      price: null,
      currency: null,
      imageIds: ["n05"],
      confidence: 0.84,
    },
    {
      name: "مانتو کوتاه زغالی",
      description: "مانتو کوتاه برای استفاده روزانه و محیط کار.",
      category: "مانتو",
      price: null,
      currency: null,
      imageIds: ["n07"],
      confidence: 0.88,
    },
    {
      name: "جکت دنیم تیره",
      description: "جکت دنیم با برش صاف، موجود تا سایز ۴۲.",
      category: "جکت",
      price: null,
      currency: null,
      imageIds: ["n17"],
      confidence: 0.8,
    },
  ],
  services: [],
  contactInfo: {
    phone: null,
    email: null,
    website: null,
    instagram: "demo",
    telegram: null,
    whatsapp: null,
    address: "تهران",
    location: "تهران",
  },
  recommendedSections: [
    "hero",
    "products",
    "about",
    "gallery",
    "instagram-feed",
    "faq",
    "contact",
    "footer",
  ],
  suggestedCTA: "مشاهده مجموعه",
  seo: {
    title: "نوران | پوشاک معاصر زنانه",
    description:
      "برند پوشاک نوران؛ کت، پیراهن و اکسسوری با طراحی دقیق برای زندگی شهری.",
    keywords: ["نوران", "پوشاک زنانه", "کت لینن", "فروشگاه لباس تهران"],
  },
  template: "store",
  heroCopy: {
    headline: "لباس آرام برای شهر شلوغ.",
    subheadline:
      "نوران لباس‌هایی می‌دوزد که در نور روز، سر کار و مهمانی یک‌شکل بمانند.",
  },
  aboutCopy:
    "نوران یک استودیوی پوشاک در تهران است. ما به‌جای تولید زیاد، برش، پارچه و جزئیات را جدی می‌گیریم. هر قطعه برای استفاده واقعی طراحی شده؛ نه فقط برای عکس.",
};

function inferTemplate(text: string): TemplateType {
  const value = text.toLowerCase();
  if (/(restaurant|cafe|food|bakery|رستوران|کافه|نان)/.test(value)) return "restaurant";
  if (/(photo|creator|artist|influencer|عکاس|کرییتور)/.test(value)) return "creator";
  if (/(design|portfolio|developer|طراح|نمونه.کار)/.test(value)) return "portfolio";
  if (/(salon|consult|agency|beauty|خدمت|سالن|مشاور)/.test(value)) return "services";
  return "store";
}

export class MockAIAnalyzer implements AIAnalyzer {
  async analyzeImport(input: {
    profile: InstagramProfile;
    posts: InstagramPost[];
    locale: "fa" | "en";
  }) {
    const username = input.profile.username.toLowerCase();
    if (username === "demo" || username === "demo.store") {
      return structuredClone(DEMO_ANALYSIS);
    }

    const corpus = [
      input.profile.fullName,
      input.profile.biography,
      input.profile.businessCategory,
      ...input.posts.map((post) => post.caption),
    ]
      .filter(Boolean)
      .join(" ");

    const template = inferTemplate(corpus);
    const businessName = input.profile.fullName || input.profile.username;
    const isFa = input.locale === "fa";

    return {
      businessType: template,
      businessName,
      summary: isFa
        ? `${businessName} یک کسب‌وکار فعال روی اینستاگرام است که حالا می‌تواند یک وب‌سایت مستقل داشته باشد.`
        : `${businessName} is an Instagram-native brand that now has a standalone website.`,
      targetAudience: isFa ? "مشتریان محلی و دنبال‌کنندگان اینستاگرام" : "Local customers and Instagram followers",
      brandTone: ["modern", "friendly"],
      visualStyle: ["clean", "visual"],
      suggestedColors: ["#111111", "#FFFFFF", "#0F766E"],
      products: [],
      services:
        template === "services"
          ? [
              {
                name: isFa ? "مشاوره و خدمات" : "Consulting",
                description: isFa
                  ? "خدمات اصلی این کسب‌وکار بر اساس محتوای پیج."
                  : "Core services inferred from the Instagram presence.",
                imageIds: input.posts.slice(0, 1).map((post) => post.id),
                confidence: 0.55,
              },
            ]
          : [],
      contactInfo: {
        phone: null,
        email: null,
        website: input.profile.externalUrl,
        instagram: input.profile.username,
        telegram: null,
        whatsapp: null,
        address: null,
        location: null,
      },
      recommendedSections: ["hero", "products", "about", "gallery", "contact", "footer"],
      suggestedCTA: isFa ? "ارتباط با ما" : "Get in touch",
      seo: {
        title: `${businessName}`,
        description:
          input.profile.biography?.slice(0, 150) ||
          (isFa ? `وب‌سایت رسمی ${businessName}` : `Official website of ${businessName}`),
        keywords: [businessName, input.profile.username],
      },
      template,
      heroCopy: {
        headline: isFa ? `${businessName}، حالا با یک سایت.` : `${businessName}, now with a website.`,
        subheadline:
          input.profile.biography?.split("\n")[0] ||
          (isFa
            ? "محتوای اینستاگرام این برند به یک وب‌سایت حرفه‌ای تبدیل شده است."
            : "This Instagram presence is now a professional website."),
      },
      aboutCopy:
        input.profile.biography ||
        (isFa
          ? `${businessName} کسب‌وکار خود را روی اینستاگرام ساخته و اکنون یک خانه مستقل روی وب دارد.`
          : `${businessName} built its brand on Instagram and now has a home on the web.`),
    } satisfies WebsiteAIAnalysis;
  }
}

export const demoAnalysis = DEMO_ANALYSIS;
