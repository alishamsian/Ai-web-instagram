/**
 * Canonical + visual section definitions for the product-owned registry.
 * Only sections that can safely persist (project HTML + optional WebsiteConfig).
 */

import type { VisualBlockDefinition } from "@/lib/visual-editor/registry/types";
import {
  ABOUT_VARIANTS,
  CTA_VARIANTS,
  GALLERY_VARIANTS,
  HERO_VARIANTS,
  TESTIMONIAL_VARIANTS,
  resolveVariantId,
} from "@/lib/visual-editor/registry/variants";
import {
  attr,
  componentAttrs,
  escapeHtml,
  sectionClose,
  sectionOpen,
} from "@/lib/visual-editor/registry/markup";

function heroMarkup(
  variant: string,
  sectionId: string,
  pageId: string,
  colors?: { primary?: string; accent?: string; foreground?: string },
): string {
  const accent = colors?.accent || colors?.primary || "#ef6351";
  const fg = colors?.foreground || "#111";
  const open = sectionOpen({
    sectionId,
    sectionType: "hero",
    variant,
    pageId,
    blockId: "section-hero",
    style:
      variant === "overlay"
        ? "padding:96px 24px;background:#1a1a22;color:#fff;text-align:center;"
        : variant === "split"
          ? "padding:72px 24px;background:#fff;color:#111;"
          : "padding:96px 24px;background:#fafafa;color:#111;text-align:center;",
  });

  const headline = `<h1${componentAttrs(sectionId, "headline", {
    "data-content-path": "content.hero.headline",
  })} style="font-size:clamp(2rem,5vw,3.25rem);line-height:1.1;margin:0 0 16px;font-weight:600;">Build something memorable</h1>`;
  const sub = `<p${componentAttrs(sectionId, "subheadline", {
    "data-content-path": "content.hero.subheadline",
  })} style="font-size:1.1rem;opacity:0.8;margin:0 0 28px;line-height:1.6;color:${variant === "overlay" ? "#ddd" : "#444"};">A clean hero for your brand story and primary call to action.</p>`;
  const cta = `<a${componentAttrs(sectionId, "cta", {
    "data-content-path": "content.hero.cta",
    href: "#",
  })} style="display:inline-block;padding:14px 28px;background:${accent};color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">Get started</a>`;

  if (variant === "split") {
    return `${open}<div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px;align-items:center;">
  <div>${headline}${sub}${cta}</div>
  <div style="min-height:280px;border-radius:12px;background:#eee;"${attr("data-component-type", "media-slot")}></div>
</div>${sectionClose()}`;
  }

  return `${open}<div style="max-width:720px;margin:0 auto;color:${variant === "overlay" ? "#fff" : fg};">
  ${headline}${sub}${cta}
</div>${sectionClose()}`;
}

function ctaMarkup(
  variant: string,
  sectionId: string,
  pageId: string,
  accent?: string,
): string {
  const bg =
    variant === "full-width"
      ? accent || "#111"
      : variant === "split"
        ? "#f4f4f5"
        : accent || "#ef6351";
  const open = sectionOpen({
    sectionId,
    sectionType: "cta",
    variant,
    pageId,
    blockId: "section-cta",
    style: `padding:64px 24px;background:${bg};color:${variant === "split" ? "#111" : "#fff"};text-align:${variant === "split" ? "start" : "center"};`,
  });
  if (variant === "split") {
    return `${open}<div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;">
  <div>
    <h2${componentAttrs(sectionId, "title", {
      "data-content-path": "content.promo.title",
    })} style="font-size:1.75rem;margin:0 0 8px;">Ready when you are</h2>
    <p style="margin:0;color:#555;">Start editing live — no refresh required.</p>
  </div>
  <a${componentAttrs(sectionId, "cta", {
    "data-content-path": "content.promo.cta",
    href: "#",
  })} style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Contact us</a>
</div>${sectionClose()}`;
  }
  return `${open}<h2${componentAttrs(sectionId, "title", {
    "data-content-path": "content.promo.title",
  })} style="font-size:2rem;margin:0 0 12px;">Ready when you are</h2>
<p style="margin:0 0 24px;opacity:0.9;">Start editing live — no refresh required.</p>
<a${componentAttrs(sectionId, "cta", {
  "data-content-path": "content.promo.cta",
  href: "#",
})} style="display:inline-block;padding:12px 24px;background:#fff;color:#111;text-decoration:none;border-radius:8px;font-weight:600;">Contact us</a>${sectionClose()}`;
}

export const SECTION_BLOCKS: VisualBlockDefinition[] = [
  {
    id: "section-hero",
    label: { fa: "هیرو", en: "Hero" },
    category: "sections",
    libraryTab: "sections",
    description: {
      fa: "سکشن معرفی برند با عنوان و دکمه",
      en: "Brand intro with headline and CTA",
    },
    keywords: ["hero", "banner", "header", "هیرو"],
    icon: "sparkles",
    sectionType: "hero",
    canonical: true,
    variants: HERO_VARIANTS,
    create: (ctx) => {
      const variant = resolveVariantId(HERO_VARIANTS, ctx.variantId) || "minimal";
      return heroMarkup(variant, ctx.sectionId, ctx.pageId, ctx.colors);
    },
  },
  {
    id: "section-about",
    label: { fa: "درباره", en: "About" },
    category: "sections",
    libraryTab: "sections",
    keywords: ["about", "story", "درباره"],
    icon: "book",
    sectionType: "about",
    canonical: true,
    variants: ABOUT_VARIANTS,
    create: (ctx) => {
      const variant = resolveVariantId(ABOUT_VARIANTS, ctx.variantId) || "story";
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "about",
        variant,
        pageId: ctx.pageId,
        blockId: "section-about",
        style: "padding:72px 24px;background:#fafafa;",
      });
      return `${open}<div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1.1fr 0.9fr;gap:40px;align-items:center;">
  <div>
    <h2${componentAttrs(ctx.sectionId, "title", {
      "data-content-path": "content.about.title",
    })} style="font-size:2rem;margin:0 0 16px;">About</h2>
    <p${componentAttrs(ctx.sectionId, "body", {
      "data-content-path": "content.about.body",
    })} style="margin:0;color:#444;line-height:1.7;">Tell your brand story with clarity and craft.</p>
  </div>
  <div style="min-height:240px;border-radius:12px;background:#e8e8e8;"></div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-services",
    label: { fa: "خدمات", en: "Services" },
    category: "sections",
    libraryTab: "sections",
    keywords: ["services", "خدمات"],
    icon: "layers",
    sectionType: "services",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "services",
        variant: "grid",
        pageId: ctx.pageId,
        blockId: "section-services",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;">
  <h2${componentAttrs(ctx.sectionId, "title", {
    "data-content-path": "content.services.title",
  })} style="font-size:2rem;margin:0 0 32px;text-align:center;">Services</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div style="padding:28px;border-radius:12px;background:#111;color:#fff;"><h3 style="margin:0 0 8px;">Brand sites</h3><p style="margin:0;opacity:0.8;">Marketing sites with editorial clarity.</p></div>
    <div style="padding:28px;border-radius:12px;background:#f4f4f5;"><h3 style="margin:0 0 8px;">Product launches</h3><p style="margin:0;color:#555;">Landing pages that convert without clutter.</p></div>
  </div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-products",
    label: { fa: "محصولات", en: "Products" },
    category: "commerce",
    libraryTab: "sections",
    keywords: ["products", "shop", "محصولات"],
    icon: "shopping-bag",
    sectionType: "products",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "products",
        variant: "grid",
        pageId: ctx.pageId,
        blockId: "section-products",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;">
  <h2${componentAttrs(ctx.sectionId, "title", {
    "data-content-path": "content.products.title",
  })} style="font-size:2rem;margin:0 0 28px;text-align:center;">Products</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
    <div style="padding:16px;border:1px solid #eee;border-radius:12px;min-height:160px;background:#fafafa;"></div>
    <div style="padding:16px;border:1px solid #eee;border-radius:12px;min-height:160px;background:#fafafa;"></div>
    <div style="padding:16px;border:1px solid #eee;border-radius:12px;min-height:160px;background:#fafafa;"></div>
  </div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-featured-products",
    label: { fa: "محصولات ویژه", en: "Featured Products" },
    category: "commerce",
    libraryTab: "sections",
    keywords: ["featured", "ویژه"],
    icon: "star",
    sectionType: "featured-products",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "featured-products",
        variant: "grid",
        pageId: ctx.pageId,
        blockId: "section-featured-products",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;text-align:center;">
  <h2 style="font-size:2rem;margin:0 0 24px;">Featured</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
    <div style="aspect-ratio:1;background:#f0f0f0;border-radius:10px;"></div>
    <div style="aspect-ratio:1;background:#f0f0f0;border-radius:10px;"></div>
    <div style="aspect-ratio:1;background:#f0f0f0;border-radius:10px;"></div>
    <div style="aspect-ratio:1;background:#f0f0f0;border-radius:10px;"></div>
  </div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-gallery",
    label: { fa: "گالری", en: "Gallery" },
    category: "media",
    libraryTab: "sections",
    keywords: ["gallery", "گالری"],
    icon: "image",
    sectionType: "gallery",
    canonical: true,
    variants: GALLERY_VARIANTS,
    create: (ctx) => {
      const variant = resolveVariantId(GALLERY_VARIANTS, ctx.variantId) || "grid";
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "gallery",
        variant,
        pageId: ctx.pageId,
        blockId: "section-gallery",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;">
  <h2${componentAttrs(ctx.sectionId, "title", {
    "data-content-path": "content.gallery.title",
  })} style="font-size:2rem;margin:0 0 24px;text-align:center;">Gallery</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
    <div style="aspect-ratio:4/3;background:#e8e8e8;border-radius:8px;"></div>
    <div style="aspect-ratio:4/3;background:#e8e8e8;border-radius:8px;"></div>
    <div style="aspect-ratio:4/3;background:#e8e8e8;border-radius:8px;"></div>
  </div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-testimonials",
    label: { fa: "نظرات", en: "Testimonials" },
    category: "sections",
    libraryTab: "sections",
    keywords: ["testimonials", "reviews", "نظرات"],
    icon: "quote",
    sectionType: "testimonials",
    canonical: true,
    variants: TESTIMONIAL_VARIANTS,
    create: (ctx) => {
      const variant =
        resolveVariantId(TESTIMONIAL_VARIANTS, ctx.variantId) || "quote";
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "testimonials",
        variant,
        pageId: ctx.pageId,
        blockId: "section-testimonials",
        style: "padding:72px 24px;background:#0f0f12;color:#fff;",
      });
      if (variant === "cards") {
        return `${open}<div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:20px;">
  <div style="padding:24px;border-radius:12px;background:#1a1a22;"><p style="margin:0 0 12px;line-height:1.6;">“Clean, intentional editing.”</p><p style="margin:0;opacity:0.65;">— Designer</p></div>
  <div style="padding:24px;border-radius:12px;background:#1a1a22;"><p style="margin:0 0 12px;line-height:1.6;">“Feels like a real design tool.”</p><p style="margin:0;opacity:0.65;">— Founder</p></div>
</div>${sectionClose()}`;
      }
      return `${open}<div style="max-width:720px;margin:0 auto;text-align:center;">
  <h2${componentAttrs(ctx.sectionId, "title", {
    "data-content-path": "content.testimonials.title",
  })} style="font-size:1.5rem;margin:0 0 24px;opacity:0.7;">Testimonials</h2>
  <p style="font-size:1.35rem;line-height:1.6;margin:0 0 20px;">“The editor feels like a real design tool — not a form with a preview.”</p>
  <p style="margin:0;opacity:0.65;font-size:0.9rem;">— Founder</p>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-faq",
    label: { fa: "سوالات متداول", en: "FAQ" },
    category: "sections",
    libraryTab: "sections",
    keywords: ["faq", "questions"],
    icon: "help-circle",
    sectionType: "faq",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "faq",
        variant: "list",
        pageId: ctx.pageId,
        blockId: "section-faq",
      });
      return `${open}<div style="max-width:720px;margin:0 auto;">
  <h2${componentAttrs(ctx.sectionId, "title", {
    "data-content-path": "content.faq.title",
  })} style="font-size:2rem;margin:0 0 24px;text-align:center;">FAQ</h2>
  <div style="border-top:1px solid #e5e5e5;padding:16px 0;"><strong>How do I edit?</strong><p style="margin:8px 0 0;color:#555;">Select any element and use the inspector.</p></div>
  <div style="border-top:1px solid #e5e5e5;padding:16px 0;"><strong>Does it save?</strong><p style="margin:8px 0 0;color:#555;">Yes — autosave keeps your draft current.</p></div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-cta",
    label: { fa: "فراخوان", en: "CTA" },
    category: "sections",
    libraryTab: "sections",
    keywords: ["cta", "promo", "call to action"],
    icon: "megaphone",
    sectionType: "cta",
    canonical: true,
    variants: CTA_VARIANTS,
    create: (ctx) => {
      const variant = resolveVariantId(CTA_VARIANTS, ctx.variantId) || "simple";
      return ctaMarkup(
        variant,
        ctx.sectionId,
        ctx.pageId,
        ctx.colors?.accent || ctx.colors?.primary,
      );
    },
  },
  {
    id: "section-contact",
    label: { fa: "تماس", en: "Contact" },
    category: "forms",
    libraryTab: "sections",
    keywords: ["contact", "تماس"],
    icon: "mail",
    sectionType: "contact",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "contact",
        variant: "form",
        pageId: ctx.pageId,
        blockId: "section-contact",
        style: "padding:72px 24px;background:#fafafa;",
      });
      return `${open}<div style="max-width:560px;margin:0 auto;">
  <h2${componentAttrs(ctx.sectionId, "title", {
    "data-content-path": "content.contact.title",
  })} style="font-size:2rem;margin:0 0 24px;text-align:center;">Contact</h2>
  <p${componentAttrs(ctx.sectionId, "body", {
    "data-content-path": "content.contact.body",
  })} style="text-align:center;color:#555;margin:0 0 24px;">We usually reply within one business day.</p>
  <form style="display:grid;gap:12px;">
    <input placeholder="Name" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;" />
    <input placeholder="Email" type="email" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;" />
    <textarea placeholder="Message" rows="4" style="padding:12px 14px;border:1px solid #ddd;border-radius:8px;resize:vertical;"></textarea>
    <button type="button" style="padding:12px;background:#111;color:#fff;border:0;border-radius:8px;font-weight:500;">Send</button>
  </form>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-social",
    label: { fa: "شبکه‌های اجتماعی", en: "Social" },
    category: "social",
    libraryTab: "sections",
    keywords: ["social", "instagram"],
    icon: "share",
    sectionType: "social",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "social",
        variant: "links",
        pageId: ctx.pageId,
        blockId: "section-social",
      });
      return `${open}<div style="max-width:640px;margin:0 auto;text-align:center;">
  <h2 style="font-size:1.75rem;margin:0 0 16px;">Follow us</h2>
  <p style="margin:0;color:#555;">Instagram · TikTok · YouTube</p>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-footer",
    label: { fa: "فوتر", en: "Footer" },
    category: "navigation",
    libraryTab: "sections",
    keywords: ["footer", "فوتر"],
    icon: "panel-bottom",
    sectionType: "footer",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "footer",
        variant: "simple",
        pageId: ctx.pageId,
        blockId: "section-footer",
        tag: "footer",
        style: "padding:40px 24px;background:#0f0f12;color:#aaa;text-align:center;",
      });
      return `${open}<p style="margin:0;font-size:0.9rem;">© ${escapeHtml(
        "Brand",
      )} — Built with Vitrin</p>${sectionClose("footer")}`;
    },
  },
  {
    id: "section-lookbook",
    label: { fa: "لوک‌بوک", en: "Lookbook" },
    category: "commerce",
    libraryTab: "sections",
    keywords: ["lookbook"],
    icon: "images",
    sectionType: "lookbook",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "lookbook",
        variant: "editorial",
        pageId: ctx.pageId,
        blockId: "section-lookbook",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;">
  <h2 style="font-size:2rem;margin:0 0 24px;">Lookbook</h2>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;min-height:320px;">
    <div style="background:#e8e8e8;border-radius:12px;"></div>
    <div style="display:grid;gap:12px;"><div style="background:#eee;border-radius:12px;"></div><div style="background:#eee;border-radius:12px;"></div></div>
  </div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-shop-the-look",
    label: { fa: "خرید این لوک", en: "Shop The Look" },
    category: "commerce",
    libraryTab: "sections",
    keywords: ["shop the look"],
    icon: "shirt",
    sectionType: "shop-the-look",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "shop-the-look",
        variant: "grid",
        pageId: ctx.pageId,
        blockId: "section-shop-the-look",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;text-align:center;">
  <h2 style="font-size:2rem;margin:0 0 8px;">Shop the look</h2>
  <p style="margin:0 0 24px;color:#555;">Curated pieces from this season.</p>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
    <div style="aspect-ratio:3/4;background:#f0f0f0;border-radius:10px;"></div>
    <div style="aspect-ratio:3/4;background:#f0f0f0;border-radius:10px;"></div>
    <div style="aspect-ratio:3/4;background:#f0f0f0;border-radius:10px;"></div>
    <div style="aspect-ratio:3/4;background:#f0f0f0;border-radius:10px;"></div>
  </div>
</div>${sectionClose()}`;
    },
  },
  {
    id: "section-categories",
    label: { fa: "دسته‌ها", en: "Categories" },
    category: "commerce",
    libraryTab: "sections",
    keywords: ["categories", "دسته‌ها"],
    icon: "grid",
    sectionType: "categories",
    canonical: true,
    create: (ctx) => {
      const open = sectionOpen({
        sectionId: ctx.sectionId,
        sectionType: "categories",
        variant: "grid",
        pageId: ctx.pageId,
        blockId: "section-categories",
      });
      return `${open}<div style="max-width:1100px;margin:0 auto;">
  <h2 style="font-size:2rem;margin:0 0 24px;text-align:center;">Shop by category</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
    <div style="padding:32px;background:#111;color:#fff;border-radius:12px;text-align:center;">New</div>
    <div style="padding:32px;background:#f4f4f5;border-radius:12px;text-align:center;">Bestsellers</div>
    <div style="padding:32px;background:#f4f4f5;border-radius:12px;text-align:center;">Essentials</div>
    <div style="padding:32px;background:#f4f4f5;border-radius:12px;text-align:center;">Sale</div>
  </div>
</div>${sectionClose()}`;
    },
  },
];
