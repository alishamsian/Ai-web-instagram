import { z } from "zod";

export const localeSchema = z.enum(["fa", "en"]);

export const instagramUsernameSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[A-Za-z0-9._]+$/);

export const colorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/);

export const productSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default("general"),
  price: z.number().nonnegative().nullable().default(null),
  currency: z.string().nullable().default(null),
  imageIds: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  hidden: z.boolean().optional().default(false),
  industryData: z
    .object({
      vertical: z.string().optional(),
      attributes: z
        .record(
          z.string(),
          z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.string()),
            z.null(),
          ]),
        )
        .optional(),
    })
    .optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  imageIds: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const contactInfoSchema = z.object({
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  instagram: z.string().nullable(),
  telegram: z.string().nullable(),
  whatsapp: z.string().nullable(),
  address: z.string().nullable(),
  location: z.string().nullable(),
});

export const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
});

export const templateSchema = z.enum([
  "store",
  "restaurant",
  "services",
  "creator",
  "portfolio",
]);

export const sectionTypeSchema = z.enum([
  "hero",
  "about",
  "products",
  "services",
  "gallery",
  "featured-posts",
  "instagram-feed",
  "testimonials",
  "faq",
  "contact",
  "location",
  "social",
  "cta",
  "footer",
]);

export const websiteAIAnalysisSchema = z.object({
  businessType: z.string().min(1),
  businessName: z.string().min(1),
  summary: z.string().min(1),
  targetAudience: z.string().min(1),
  brandTone: z.array(z.string()).min(1),
  visualStyle: z.array(z.string()).min(1),
  suggestedColors: z.array(colorSchema).min(1).max(6),
  products: z.array(productSchema).default([]),
  services: z.array(serviceSchema).default([]),
  contactInfo: contactInfoSchema,
  recommendedSections: z.array(sectionTypeSchema).min(3),
  suggestedCTA: z.string().min(1),
  seo: seoSchema,
  template: templateSchema,
  heroCopy: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1),
  }),
  aboutCopy: z.string().min(1),
  businessProfile: z
    .object({
      vertical: z.string().nullable().optional(),
      subVertical: z.string().nullable().optional(),
      style: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1).nullable().optional(),
      recommendedTemplate: z.string().nullable().optional(),
      recommendedModules: z.array(z.string()).optional(),
      productAttributes: z.array(z.string()).optional(),
      fallbackVertical: z.string().nullable().optional(),
      mood: z.string().nullable().optional(),
    })
    .optional(),
});

export type WebsiteAIAnalysisInput = z.input<typeof websiteAIAnalysisSchema>;
