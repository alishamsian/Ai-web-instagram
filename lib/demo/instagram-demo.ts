/**
 * Shared demo brand for the Instagram → Website transformation section.
 * Both Instagram and Website previews MUST consume this single source of truth.
 */

export type DemoProduct = {
  id: string;
  name: string;
  price: string;
  image: string;
};

export type DemoBrand = {
  name: string;
  username: string;
  handle: string;
  category: string;
  bio: string;
  link: string;
  followers: string;
  following: string;
  posts: string;
  siteUrl: string;
  headline: string;
  subheadline: string;
  about: string;
  cta: string;
  colors: {
    ivory: string;
    softNeutral: string;
    charcoal: string;
    mutedAccent: string;
    foreground: string;
  };
  avatar: string;
  images: string[];
  products: DemoProduct[];
  signals: {
    business: string;
    style: string;
    content: string;
    tone: string;
  };
};

const images = [
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1596755389378-c31d21fd2172?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1571781926291-c77dfda1b5b1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1629198688000-71f23e745b69?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1611930022073-b7a4ba5fccb2?auto=format&fit=crop&w=900&q=80",
] as const;

export const INSTAGRAM_DEMO_BRAND: DemoBrand = {
  name: "LUNA STUDIO",
  username: "lunastudio",
  handle: "@lunastudio",
  category: "Beauty & Skincare",
  bio: "Clean beauty for everyday rituals.",
  link: "luna.studio",
  followers: "12.4K",
  following: "186",
  posts: "84",
  siteUrl: "luna.studio",
  headline: "Beauty, simplified.",
  subheadline: "Thoughtfully selected beauty essentials for your everyday ritual.",
  about:
    "LUNA STUDIO creates quiet, effective formulas for skin that prefers fewer steps and better ingredients.",
  cta: "Shop the collection",
  colors: {
    ivory: "#F7F3EE",
    softNeutral: "#E8E0D6",
    charcoal: "#1A1714",
    mutedAccent: "#C4A090",
    foreground: "#2A241F",
  },
  avatar:
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=240&q=80",
  images: [...images],
  products: [
    {
      id: "serum",
      name: "Vitamin C Serum",
      price: "$48",
      image: images[2],
    },
    {
      id: "cream",
      name: "Silk Moisturizer",
      price: "$42",
      image: images[1],
    },
    {
      id: "toner",
      name: "Gentle Toner",
      price: "$26",
      image: images[6],
    },
  ],
  signals: {
    business: "Beauty & Skincare",
    style: "Editorial / Minimal",
    content: "Products / Lifestyle",
    tone: "Clean / Elegant",
  },
};

export type TransformStage =
  | "idle"
  | "url"
  | "analyzing"
  | "understood"
  | "generating"
  | "ready";

export function stageFromProgress(progress: number): TransformStage {
  if (progress < 0.18) return "idle";
  if (progress < 0.36) return "url";
  if (progress < 0.52) return "analyzing";
  if (progress < 0.66) return "understood";
  if (progress < 0.82) return "generating";
  return "ready";
}
