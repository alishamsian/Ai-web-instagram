/**
 * Project WebsiteConfig → GrapesJS HTML with stable application IDs (Phase 2).
 * Seed/demo content is NEVER used when the site already has real sections/content.
 */

import type { ProjectData } from "grapesjs";
import type {
  SectionConfig,
  WebsiteConfig,
  WebsiteSectionType,
} from "@/types/website";
import {
  visualComponentId,
  VISUAL_PAGE_ABOUT,
  VISUAL_PAGE_HOME,
  stableCollectionItemId,
} from "@/lib/visual-editor/ids";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mediaUrl(config: WebsiteConfig, id?: string): string | undefined {
  if (!id) return undefined;
  return config.media[id]?.url;
}

function mediaAlt(config: WebsiteConfig, id?: string): string {
  if (!id) return "";
  return config.media[id]?.alt ?? "";
}

function attr(name: string, value: string | boolean | undefined): string {
  if (value === undefined || value === false) return "";
  if (value === true) return ` ${name}`;
  return ` ${name}="${escapeHtml(String(value))}"`;
}

function componentAttrs(
  sectionId: string,
  role: string,
  extra: Record<string, string | undefined> = {},
): string {
  const parts = [
    attr("data-component-id", visualComponentId(sectionId, role)),
    ...Object.entries(extra).map(([k, v]) => attr(k, v)),
  ];
  return parts.join("");
}

function sectionShell(
  section: SectionConfig,
  inner: string,
  style = "padding:48px 24px;",
): string {
  const hidden = section.visible === false;
  const settingsJson =
    section.settings && Object.keys(section.settings).length > 0
      ? JSON.stringify(section.settings)
      : undefined;
  return `<section${attr("data-section-id", section.id)}${attr(
    "data-section-type",
    section.type,
  )}${attr("data-section-variant", section.variant)}${attr(
    "data-visible",
    section.visible !== false ? "true" : "false",
  )}${attr("data-section-settings", settingsJson)} style="${style}${
    hidden ? "opacity:0.45;outline:1px dashed #999;" : ""
  }">${inner}</section>`;
}

function renderHero(config: WebsiteConfig, section: SectionConfig): string {
  const hero = config.content.hero;
  const img = mediaUrl(config, hero.imageId);
  const imgAlt = mediaAlt(config, hero.imageId);
  const imageBlock = img
    ? `<img${componentAttrs(section.id, "image", {
        "data-content-path": "content.hero.imageId",
        "data-media-id": hero.imageId ?? "",
        src: img,
        alt: imgAlt,
      })} style="display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-top:24px;" />`
    : "";
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;text-align:center;">
      <h1${componentAttrs(section.id, "headline", {
        "data-content-path": "content.hero.headline",
      })} style="font-size:clamp(1.8rem,4vw,3rem);line-height:1.15;margin:0 0 12px;font-weight:600;">${escapeHtml(
        hero.headline || "Headline",
      )}</h1>
      <p${componentAttrs(section.id, "subheadline", {
        "data-content-path": "content.hero.subheadline",
      })} style="font-size:1.05rem;line-height:1.6;margin:0 0 20px;color:#444;">${escapeHtml(
        hero.subheadline || "",
      )}</p>
      <a${componentAttrs(section.id, "cta", {
        "data-content-path": "content.hero.cta",
        "data-href-path": "content.hero.ctaHref",
        href: hero.ctaHref || "#",
      })} style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">${escapeHtml(
        hero.cta || "CTA",
      )}</a>
      ${imageBlock}
    </div>`,
    "padding:72px 24px;background:#fafafa;",
  );
}

function renderAbout(config: WebsiteConfig, section: SectionConfig): string {
  const about = config.content.about;
  if (!about) {
    return sectionShell(
      section,
      `<div style="max-width:800px;margin:0 auto;"><p style="color:#888;">About</p></div>`,
    );
  }
  const img = mediaUrl(config, about.imageId);
  const imgAlt = mediaAlt(config, about.imageId);
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:${
      img ? "1.1fr 0.9fr" : "1fr"
    };gap:32px;align-items:center;">
      <div>
        <h2${componentAttrs(section.id, "title", {
          "data-content-path": "content.about.title",
        })} style="font-size:1.75rem;margin:0 0 12px;">${escapeHtml(
          about.title || "",
        )}</h2>
        <p${componentAttrs(section.id, "body", {
          "data-content-path": "content.about.body",
        })} style="margin:0;line-height:1.7;color:#444;white-space:pre-wrap;">${escapeHtml(
          about.body || "",
        )}</p>
      </div>
      ${
        img
          ? `<img${componentAttrs(section.id, "image", {
              "data-content-path": "content.about.imageId",
              "data-media-id": about.imageId ?? "",
              src: img,
              alt: imgAlt,
            })} style="width:100%;border-radius:12px;display:block;" />`
          : ""
      }
    </div>`,
  );
}

function renderGenericTitleBody(
  section: SectionConfig,
  title: string,
  body: string,
  titlePath?: string,
  bodyPath?: string,
): string {
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": titlePath,
      })} style="font-size:1.75rem;margin:0 0 12px;">${escapeHtml(title)}</h2>
      <div${componentAttrs(section.id, "body", {
        "data-content-path": bodyPath,
      })} style="color:#444;line-height:1.6;">${escapeHtml(body)}</div>
    </div>`,
  );
}

function renderProducts(config: WebsiteConfig, section: SectionConfig): string {
  const products = config.content.products;
  const title = products?.title || "Products";
  const items = (products?.items ?? []).slice(0, 8);
  const cards = items
    .map((item, index) => {
      const imageId = item.imageIds?.[0];
      const url = mediaUrl(config, imageId);
      const productId = stableCollectionItemId("products", item, index);
      return `<div${componentAttrs(section.id, `product-${productId}`, {
        "data-collection": "products",
        "data-item-id": productId,
        "data-product-id": productId,
        "data-product-index": String(index),
      })} style="border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">
        ${
          url
            ? `<img${componentAttrs(section.id, `product-${productId}-image`, {
                "data-collection": "products",
                "data-item-id": productId,
                "data-content-path": "content.products.items.imageIds.0",
                "data-media-id": imageId,
                src: url,
                alt: item.name,
              })} style="width:100%;height:160px;object-fit:cover;display:block;" />`
            : `<div style="height:120px;background:#f3f3f3;"></div>`
        }
        <div style="padding:14px;">
          <h3${componentAttrs(section.id, `product-${productId}-name`, {
            "data-collection": "products",
            "data-item-id": productId,
            "data-content-path": "content.products.items.name",
          })} style="margin:0 0 6px;font-size:1rem;">${escapeHtml(item.name)}</h3>
          <p${componentAttrs(section.id, `product-${productId}-desc`, {
            "data-collection": "products",
            "data-item-id": productId,
            "data-content-path": "content.products.items.description",
          })} style="margin:0;color:#666;font-size:0.9rem;">${escapeHtml(
            item.description || "",
          )}</p>
        </div>
      </div>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.products.title",
      })} style="font-size:1.75rem;margin:0 0 24px;text-align:center;">${escapeHtml(
        title,
      )}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">${
        cards || `<p style="color:#888;text-align:center;">No products yet</p>`
      }</div>
    </div>`,
  );
}

function renderGallery(config: WebsiteConfig, section: SectionConfig): string {
  const gallery = config.content.gallery;
  const ids = gallery?.imageIds ?? [];
  const images = ids
    .map((id, index) => {
      const url = mediaUrl(config, id);
      if (!url) return "";
      return `<img${componentAttrs(section.id, `gallery-${index}`, {
        "data-media-id": id,
        "data-gallery-index": String(index),
        "data-content-path": "content.gallery.imageIds",
        src: url,
        alt: mediaAlt(config, id),
      })} style="width:100%;height:180px;object-fit:cover;border-radius:10px;display:block;" />`;
    })
    .filter(Boolean)
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.gallery.title",
      })} style="font-size:1.75rem;margin:0 0 24px;text-align:center;">${escapeHtml(
        gallery?.title || "Gallery",
      )}</h2>
      <div data-gallery-root="true" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">${
        images || `<p style="color:#888;text-align:center;">No images</p>`
      }</div>
    </div>`,
  );
}

function renderTestimonials(
  config: WebsiteConfig,
  section: SectionConfig,
): string {
  const block = config.content.testimonials;
  const items = (block?.items ?? [])
    .map((item, index) => {
      const tid = stableCollectionItemId("testimonials", item, index);
      return `<blockquote${componentAttrs(section.id, `testimonial-${tid}`, {
        "data-collection": "testimonials",
        "data-item-id": tid,
        "data-testimonial-id": tid,
      })} style="margin:0;padding:20px;border:1px solid #eee;border-radius:12px;">
      <p${componentAttrs(section.id, `testimonial-${tid}-quote`, {
        "data-collection": "testimonials",
        "data-item-id": tid,
        "data-content-path": "content.testimonials.items.quote",
      })} style="margin:0 0 10px;line-height:1.6;">${escapeHtml(item.quote)}</p>
      <footer${componentAttrs(section.id, `testimonial-${tid}-author`, {
        "data-collection": "testimonials",
        "data-item-id": tid,
        "data-content-path": "content.testimonials.items.author",
      })} style="color:#666;font-size:0.9rem;">— ${escapeHtml(
        item.author,
      )}</footer>
    </blockquote>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.testimonials.title",
      })} style="font-size:1.75rem;margin:0 0 24px;text-align:center;">${escapeHtml(
        block?.title || "Testimonials",
      )}</h2>
      <div style="display:grid;gap:12px;">${items || "<p style='color:#888;'>No testimonials</p>"}</div>
    </div>`,
  );
}

function renderFaq(config: WebsiteConfig, section: SectionConfig): string {
  const faq = config.content.faq;
  const items = (faq?.items ?? [])
    .map((item, index) => {
      const fid = stableCollectionItemId("faq", item, index);
      return `<details${componentAttrs(section.id, `faq-${fid}`, {
        "data-collection": "faq",
        "data-item-id": fid,
        "data-faq-id": fid,
      })} style="border:1px solid #eee;border-radius:10px;padding:12px 14px;">
      <summary${componentAttrs(section.id, `faq-${fid}-q`, {
        "data-collection": "faq",
        "data-item-id": fid,
        "data-content-path": "content.faq.items.question",
      })} style="font-weight:550;cursor:pointer;">${escapeHtml(
        item.question,
      )}</summary>
      <p${componentAttrs(section.id, `faq-${fid}-a`, {
        "data-collection": "faq",
        "data-item-id": fid,
        "data-content-path": "content.faq.items.answer",
      })} style="margin:10px 0 0;color:#555;line-height:1.6;">${escapeHtml(
        item.answer,
      )}</p>
    </details>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:720px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.faq.title",
      })} style="font-size:1.75rem;margin:0 0 20px;text-align:center;">${escapeHtml(
        faq?.title || "FAQ",
      )}</h2>
      <div style="display:grid;gap:10px;">${items || "<p style='color:#888;'>No questions</p>"}</div>
    </div>`,
  );
}

function renderContact(config: WebsiteConfig, section: SectionConfig): string {
  const contact = config.content.contact;
  return sectionShell(
    section,
    `<div style="max-width:640px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.contact.title",
      })} style="font-size:1.75rem;margin:0 0 12px;text-align:center;">${escapeHtml(
        contact?.title || "Contact",
      )}</h2>
      <p${componentAttrs(section.id, "body", {
        "data-content-path": "content.contact.body",
      })} style="margin:0 0 16px;color:#444;line-height:1.6;text-align:center;">${escapeHtml(
        contact?.body || "",
      )}</p>
      <p style="margin:0;text-align:center;color:#666;font-size:0.95rem;">${escapeHtml(
        [contact?.info?.email, contact?.info?.phone, contact?.info?.address]
          .filter(Boolean)
          .join(" · "),
      )}</p>
    </div>`,
  );
}

function renderPromo(config: WebsiteConfig, section: SectionConfig): string {
  const promo = config.content.promo;
  return sectionShell(
    section,
    `<div style="max-width:720px;margin:0 auto;text-align:center;color:#fff;">
      <p${componentAttrs(section.id, "kicker", {
        "data-content-path": "content.promo.kicker",
      })} style="margin:0 0 8px;opacity:0.8;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;">${escapeHtml(
        promo?.kicker || "",
      )}</p>
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.promo.title",
      })} style="font-size:1.8rem;margin:0 0 16px;">${escapeHtml(
        promo?.title || "",
      )}</h2>
      <a${componentAttrs(section.id, "cta", {
        "data-content-path": "content.promo.cta",
        "data-href-path": "content.promo.ctaHref",
        href: promo?.ctaHref || "#",
      })} style="display:inline-block;padding:12px 22px;background:#fff;color:#111;text-decoration:none;border-radius:8px;font-weight:550;">${escapeHtml(
        promo?.cta || "Learn more",
      )}</a>
    </div>`,
    "padding:56px 24px;background:#111;",
  );
}

function renderFooter(config: WebsiteConfig, section: SectionConfig): string {
  const name = config.brand.name || "Site";
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;text-align:center;color:#aaa;">
      <p${componentAttrs(section.id, "copyright")} style="margin:0;font-size:0.9rem;">© ${escapeHtml(
        name,
      )}</p>
    </div>`,
    "padding:36px 24px;background:#0f0f12;",
  );
}

function renderFallback(section: SectionConfig): string {
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;padding:24px;border:1px dashed #ccc;border-radius:12px;color:#666;">
      <strong style="display:block;margin-bottom:6px;">${escapeHtml(
        section.type,
      )}</strong>
      <span style="font-size:0.85rem;">Section preserved (visual mapping limited — data kept in WebsiteConfig)</span>
    </div>`,
  );
}

function renderLookbook(config: WebsiteConfig, section: SectionConfig): string {
  const lb = config.content.lookbook;
  const title = lb?.title || "Lookbook";
  const items = lb?.items ?? [];
  const cells = items
    .map((item) => {
      const url = mediaUrl(config, item.imageId) || "";
      return `<figure data-collection="lookbook" data-lookbook-id="${escapeHtml(
        item.id,
      )}" style="margin:0;background:#eee;border-radius:12px;overflow:hidden;aspect-ratio:3/4;">
        ${
          url
            ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(
                item.caption || title,
              )}" data-content-path="content.lookbook.items.imageId" data-media-id="${escapeHtml(
                item.imageId,
              )}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
            : ""
        }
      </figure>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.lookbook.title",
      })} style="font-size:2rem;margin:0 0 8px;">${escapeHtml(title)}</h2>
      ${
        lb?.description
          ? `<p${componentAttrs(section.id, "description", {
              "data-content-path": "content.lookbook.description",
            })} style="margin:0 0 24px;color:#555;">${escapeHtml(
              lb.description,
            )}</p>`
          : ""
      }
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">${cells}</div>
    </div>`,
  );
}

function renderShopTheLook(
  config: WebsiteConfig,
  section: SectionConfig,
): string {
  const stl = config.content.shopTheLook;
  const title = stl?.title || "Shop the look";
  const items = stl?.items ?? [];
  const cards = items
    .map((item) => {
      const url = mediaUrl(config, item.imageId) || "";
      return `<article data-collection="shopTheLook" data-shop-the-look-id="${escapeHtml(
        item.id,
      )}" style="border:1px solid #eee;border-radius:12px;overflow:hidden;">
        ${
          url
            ? `<img src="${escapeHtml(url)}" alt="" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block;" />`
            : `<div style="aspect-ratio:3/4;background:#f0f0f0;"></div>`
        }
        <div style="padding:12px;">
          <h3 data-content-path="content.shopTheLook.items.title" style="margin:0;font-size:1rem;">${escapeHtml(
            item.title,
          )}</h3>
        </div>
      </article>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;text-align:center;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.shopTheLook.title",
      })} style="font-size:2rem;margin:0 0 8px;">${escapeHtml(title)}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;text-align:start;">${cards}</div>
    </div>`,
  );
}

function renderCategories(
  config: WebsiteConfig,
  section: SectionConfig,
): string {
  const cats = config.content.categories;
  const title = cats?.title || "Categories";
  const items = cats?.items ?? [];
  const cards = items
    .map((item) => {
      const url = mediaUrl(config, item.imageId) || "";
      return `<a href="${escapeHtml(
        item.href || `/${item.slug}`,
      )}" data-collection="categories" data-category-id="${escapeHtml(
        item.id,
      )}" style="display:block;text-decoration:none;color:inherit;border-radius:12px;overflow:hidden;border:1px solid #eee;">
        ${
          url
            ? `<img src="${escapeHtml(url)}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;" />`
            : `<div style="aspect-ratio:4/3;background:#f3f3f3;"></div>`
        }
        <p data-content-path="content.categories.items.title" style="margin:0;padding:12px;font-weight:600;">${escapeHtml(
          item.title,
        )}</p>
      </a>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.categories.title",
      })} style="font-size:2rem;margin:0 0 24px;">${escapeHtml(title)}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">${cards}</div>
    </div>`,
  );
}

function renderPricing(config: WebsiteConfig, section: SectionConfig): string {
  const pricing = config.content.pricing;
  const title = pricing?.title || "Pricing";
  const plans = pricing?.plans ?? [];
  const cards = plans
    .map((plan) => {
      const features = plan.features
        .map((f) => `<li style="margin:0 0 6px;">${escapeHtml(f)}</li>`)
        .join("");
      return `<article data-collection="pricing" data-plan-id="${escapeHtml(
        plan.id,
      )}" style="border:1px solid ${
        plan.highlighted ? "#111" : "#e5e5e5"
      };border-radius:16px;padding:24px;background:${
        plan.highlighted ? "#111" : "#fff"
      };color:${plan.highlighted ? "#fff" : "#111"};">
        <h3 data-content-path="content.pricing.plans.name" style="margin:0 0 8px;font-size:1.25rem;">${escapeHtml(
          plan.name,
        )}</h3>
        <p data-content-path="content.pricing.plans.price" style="margin:0 0 16px;font-size:2rem;font-weight:600;">${escapeHtml(
          plan.price,
        )}${
          plan.period
            ? `<span style="font-size:0.9rem;opacity:0.7;">/${escapeHtml(
                plan.period,
              )}</span>`
            : ""
        }</p>
        <ul style="margin:0 0 20px;padding-inline-start:1.1rem;font-size:0.9rem;">${features}</ul>
        <a href="${escapeHtml(
          plan.ctaHref || "#",
        )}" data-content-path="content.pricing.plans.ctaLabel" style="display:inline-block;padding:10px 16px;border-radius:999px;background:${
          plan.highlighted ? "#fff" : "#111"
        };color:${
          plan.highlighted ? "#111" : "#fff"
        };text-decoration:none;font-size:0.9rem;">${escapeHtml(
          plan.ctaLabel || "Choose",
        )}</a>
      </article>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.pricing.title",
      })} style="font-size:2rem;margin:0 0 8px;text-align:center;">${escapeHtml(
        title,
      )}</h2>
      ${
        pricing?.description
          ? `<p${componentAttrs(section.id, "description", {
              "data-content-path": "content.pricing.description",
            })} style="margin:0 0 28px;text-align:center;color:#555;">${escapeHtml(
              pricing.description,
            )}</p>`
          : ""
      }
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">${cards}</div>
    </div>`,
  );
}

function renderMenu(config: WebsiteConfig, section: SectionConfig): string {
  const menu = config.content.menu;
  const title = menu?.title || "Menu";
  const items = menu?.items ?? [];
  const rows = items
    .map((item) => {
      return `<div data-collection="menu" data-menu-item-id="${escapeHtml(
        item.id,
      )}" style="display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #eee;">
        <div>
          <strong data-content-path="content.menu.items.title">${escapeHtml(
            item.title,
          )}</strong>
          ${
            item.description
              ? `<p data-content-path="content.menu.items.description" style="margin:4px 0 0;color:#666;font-size:0.9rem;">${escapeHtml(
                  item.description,
                )}</p>`
              : ""
          }
        </div>
        ${
          item.price
            ? `<span data-content-path="content.menu.items.price" style="white-space:nowrap;font-weight:600;">${escapeHtml(
                item.price,
              )}</span>`
            : ""
        }
      </div>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:720px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.menu.title",
      })} style="font-size:2rem;margin:0 0 24px;">${escapeHtml(title)}</h2>
      ${rows}
    </div>`,
  );
}

function renderLocation(config: WebsiteConfig, section: SectionConfig): string {
  const loc = config.content.location;
  const title = loc?.title || "Location";
  const map = loc?.mapUrl
    ? `<a href="${escapeHtml(loc.mapUrl)}" rel="noopener noreferrer" style="color:inherit;">${escapeHtml(
        loc.mapUrl,
      )}</a>`
    : "";
  return sectionShell(
    section,
    `<div style="max-width:720px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.location.title",
      })} style="font-size:2rem;margin:0 0 12px;">${escapeHtml(title)}</h2>
      ${
        loc?.address
          ? `<p${componentAttrs(section.id, "address", {
              "data-content-path": "content.location.address",
            })} style="margin:0 0 6px;">${escapeHtml(loc.address)}</p>`
          : ""
      }
      ${
        loc?.city
          ? `<p${componentAttrs(section.id, "city", {
              "data-content-path": "content.location.city",
            })} style="margin:0 0 6px;">${escapeHtml(loc.city)}</p>`
          : ""
      }
      ${
        loc?.hours
          ? `<p${componentAttrs(section.id, "hours", {
              "data-content-path": "content.location.hours",
            })} style="margin:0 0 6px;">${escapeHtml(loc.hours)}</p>`
          : ""
      }
      ${
        loc?.phone
          ? `<p${componentAttrs(section.id, "phone", {
              "data-content-path": "content.location.phone",
            })} style="margin:0 0 12px;">${escapeHtml(loc.phone)}</p>`
          : ""
      }
      ${map}
    </div>`,
  );
}

function renderPortfolio(
  config: WebsiteConfig,
  section: SectionConfig,
): string {
  const portfolio = config.content.portfolio;
  const title = portfolio?.title || "Work";
  const items = portfolio?.items ?? [];
  const cards = items
    .map((item) => {
      const url = mediaUrl(config, item.imageId) || "";
      return `<article data-collection="portfolio" data-portfolio-id="${escapeHtml(
        item.id,
      )}" style="border-radius:12px;overflow:hidden;border:1px solid #eee;">
        ${
          url
            ? `<img src="${escapeHtml(url)}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;" />`
            : `<div style="aspect-ratio:4/3;background:#f0f0f0;"></div>`
        }
        <div style="padding:12px;">
          <h3 data-content-path="content.portfolio.items.title" style="margin:0 0 4px;">${escapeHtml(
            item.title,
          )}</h3>
          ${
            item.tag
              ? `<p style="margin:0;color:#777;font-size:0.8rem;">${escapeHtml(
                  item.tag,
                )}</p>`
              : ""
          }
        </div>
      </article>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.portfolio.title",
      })} style="font-size:2rem;margin:0 0 24px;">${escapeHtml(title)}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">${cards}</div>
    </div>`,
  );
}

function renderProperties(
  config: WebsiteConfig,
  section: SectionConfig,
): string {
  const props = config.content.properties;
  const title = props?.title || "Properties";
  const items = props?.items ?? [];
  const cards = items
    .map((item) => {
      const url = mediaUrl(config, item.imageId) || "";
      return `<article data-collection="properties" data-property-id="${escapeHtml(
        item.id,
      )}" style="border-radius:12px;overflow:hidden;border:1px solid #eee;">
        ${
          url
            ? `<img src="${escapeHtml(url)}" alt="" style="width:100%;aspect-ratio:16/10;object-fit:cover;display:block;" />`
            : `<div style="aspect-ratio:16/10;background:#eee;"></div>`
        }
        <div style="padding:14px;">
          <h3 data-content-path="content.properties.items.title" style="margin:0 0 4px;">${escapeHtml(
            item.title,
          )}</h3>
          ${
            item.location
              ? `<p data-content-path="content.properties.items.location" style="margin:0 0 4px;color:#666;font-size:0.9rem;">${escapeHtml(
                  item.location,
                )}</p>`
              : ""
          }
          ${
            item.price
              ? `<p data-content-path="content.properties.items.price" style="margin:0;font-weight:600;">${escapeHtml(
                  item.price,
                )}</p>`
              : ""
          }
        </div>
      </article>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2${componentAttrs(section.id, "title", {
        "data-content-path": "content.properties.title",
      })} style="font-size:2rem;margin:0 0 24px;">${escapeHtml(title)}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">${cards}</div>
    </div>`,
  );
}

function renderSection(config: WebsiteConfig, section: SectionConfig): string {
  const type = section.type as WebsiteSectionType;
  switch (type) {
    case "hero":
      return renderHero(config, section);
    case "about":
      return renderAbout(config, section);
    case "products":
    case "featured-products":
    case "bestsellers":
    case "product-spotlight":
      return renderProducts(config, section);
    case "gallery":
    case "instagram-feed":
    case "featured-posts":
      return renderGallery(config, section);
    case "testimonials":
      return renderTestimonials(config, section);
    case "faq":
      return renderFaq(config, section);
    case "contact":
    case "reservations":
      return renderContact(config, section);
    case "cta":
    case "promo":
      return renderPromo(config, section);
    case "footer":
      return renderFooter(config, section);
    case "services":
      return renderGenericTitleBody(
        section,
        config.content.services?.title || "Services",
        (config.content.services?.items ?? [])
          .map((s) => s.name)
          .join(" · ") || "",
        "content.services.title",
      );
    case "trust":
      return renderGenericTitleBody(
        section,
        "Trust",
        (config.content.trust?.items ?? []).join(" · "),
      );
    case "lookbook":
      return renderLookbook(config, section);
    case "shop-the-look":
      return renderShopTheLook(config, section);
    case "categories":
      return renderCategories(config, section);
    case "pricing":
      return renderPricing(config, section);
    case "menu":
      return renderMenu(config, section);
    case "location":
      return renderLocation(config, section);
    case "portfolio":
    case "projects":
      return renderPortfolio(config, section);
    case "properties":
      return renderProperties(config, section);
    default:
      return renderFallback(section);
  }
}

/** Render section list HTML from WebsiteConfig (shared by project builder). */
export function renderSectionsFromConfig(
  config: WebsiteConfig,
  sections: SectionConfig[],
): string {
  return sections.map((section) => renderSection(config, section)).join("\n");
}

/** True when the site has real structural content (not empty shell). */
export function websiteConfigHasRenderableContent(
  config: WebsiteConfig,
): boolean {
  if (config.sections.length > 0) return true;
  if (config.content.hero?.headline?.trim()) return true;
  if (config.content.about?.title?.trim() || config.content.about?.body?.trim()) {
    return true;
  }
  if ((config.content.products?.items?.length ?? 0) > 0) return true;
  if ((config.content.pricing?.plans?.length ?? 0) > 0) return true;
  if ((config.content.menu?.items?.length ?? 0) > 0) return true;
  if ((config.content.portfolio?.items?.length ?? 0) > 0) return true;
  if ((config.content.properties?.items?.length ?? 0) > 0) return true;
  return false;
}

export function buildProjectFromWebsiteConfig(
  config: WebsiteConfig,
): ProjectData {
  const dir = config.settings.direction === "rtl" ? "rtl" : "ltr";
  const lang = config.settings.language === "en" ? "en" : "fa";
  const bg = config.brand.colors.background || "#ffffff";
  const fg = config.brand.colors.foreground || "#111111";

  const assets = Object.entries(config.media).map(([id, media]) => ({
    type: media.type === "video" ? "video" : "image",
    src: media.url,
    name: media.alt || id,
    id,
  }));

  const pageMetas =
    config.pages && config.pages.length > 0
      ? config.pages
      : [
          {
            id: VISUAL_PAGE_HOME,
            slug: "",
            name: "Home",
            kind: "home" as const,
            sections: config.sections,
          },
        ];

  const pages = pageMetas.map((page) => {
    const sections =
      page.kind === "home"
        ? config.sections
        : page.sections && page.sections.length > 0
          ? page.sections
          : page.kind === "about"
            ? config.sections.filter(
                (s) => s.type === "about" || s.type === "footer",
              )
            : [];
    const sectionsHtml = renderSectionsFromConfig(config, sections);
    const body = `<body data-website-page="${escapeHtml(
      page.id,
    )}" data-page-slug="${escapeHtml(
      page.slug,
    )}" data-ve-source="website-config" data-ve-adapter="2" dir="${dir}" lang="${lang}" style="margin:0;font-family:system-ui,-apple-system,sans-serif;color:${escapeHtml(
      fg,
    )};background:${escapeHtml(bg)};">
${
  sectionsHtml ||
  `<main style="padding:64px 24px;text-align:center;"><h1>${escapeHtml(
    page.name || config.brand.name || "Page",
  )}</h1></main>`
}
</body>`;
    return {
      id: page.id,
      name: page.name,
      slug: page.slug,
      component: body,
    };
  }) as ProjectData["pages"];

  // Ensure home exists even if pages metadata omitted it
  if (!pages?.some((p: { id?: string }) => p.id === VISUAL_PAGE_HOME)) {
    const sectionsHtml = renderSectionsFromConfig(config, config.sections);
    pages?.unshift({
      id: VISUAL_PAGE_HOME,
      name: "Home",
      slug: "",
      component: `<body data-website-page="${VISUAL_PAGE_HOME}" data-ve-source="website-config" data-ve-adapter="2" dir="${dir}" lang="${lang}" style="margin:0;font-family:system-ui,-apple-system,sans-serif;color:${escapeHtml(
        fg,
      )};background:${escapeHtml(bg)};">
${sectionsHtml}
</body>`,
    } as never);
  }

  // Legacy / Classic sites: synthesize About page from content.about when missing
  if (
    !pages?.some((p: { id?: string }) => p.id === VISUAL_PAGE_ABOUT) &&
    (config.content.about?.title?.trim() || config.content.about?.body?.trim())
  ) {
    const aboutSection =
      config.sections.find((s) => s.type === "about") ??
      ({
        id: "about-page",
        type: "about" as const,
        visible: true,
      } satisfies SectionConfig);
    pages?.push({
      id: VISUAL_PAGE_ABOUT,
      name: "About",
      slug: "about",
      component: `<body data-website-page="${VISUAL_PAGE_ABOUT}" data-page-slug="about" data-ve-source="website-config" data-ve-adapter="2" dir="${dir}" lang="${lang}" style="margin:0;font-family:system-ui,-apple-system,sans-serif;color:${escapeHtml(
        fg,
      )};background:${escapeHtml(bg)};">
${renderAbout(config, aboutSection)}
</body>`,
    } as never);
  }

  return {
    pages,
    styles: [],
    assets,
  };
}
