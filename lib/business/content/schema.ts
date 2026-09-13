export type GeneratedWebsiteContent = {
  brandName: string;
  tagline: string | null;
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  about: {
    title: string;
    body: string;
  } | null;
  productsTitle: string | null;
  newsletterHint: string | null;
  sectionCopy: Record<
    string,
    { kicker?: string; title?: string; description?: string }
  >;
};

export type ContentLocale = "fa" | "en";
