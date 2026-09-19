/**
 * Project WebsiteConfig → GrapesJS HTML with stable application IDs.
 * Seed/demo content is NEVER used when the site already has real sections/content.
 */

import type { ProjectData } from "grapesjs";
import type {
  SectionConfig,
  WebsiteConfig,
  WebsiteSectionType,
} from "@/types/website";

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

function sectionShell(
  section: SectionConfig,
  inner: string,
  style = "padding:48px 24px;",
): string {
  const hidden = section.visible === false;
  return `<section${attr("data-section-id", section.id)}${attr(
    "data-section-type",
    section.type,
  )}${attr("data-section-variant", section.variant)}${attr(
    "data-visible",
    section.visible !== false ? "true" : "false",
  )} style="${style}${hidden ? "opacity:0.45;outline:1px dashed #999;" : ""}">${inner}</section>`;
}

function renderHero(config: WebsiteConfig, section: SectionConfig): string {
  const hero = config.content.hero;
  const img = mediaUrl(config, hero.imageId);
  const imgAlt = mediaAlt(config, hero.imageId);
  const imageBlock = img
    ? `<img data-content-path="content.hero.imageId" data-media-id="${escapeHtml(
        hero.imageId ?? "",
      )}" src="${escapeHtml(img)}" alt="${escapeHtml(
        imgAlt,
      )}" style="display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-top:24px;" />`
    : "";
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;text-align:center;">
      <h1 data-content-path="content.hero.headline" style="font-size:clamp(1.8rem,4vw,3rem);line-height:1.15;margin:0 0 12px;font-weight:600;">${escapeHtml(
        hero.headline || "Headline",
      )}</h1>
      <p data-content-path="content.hero.subheadline" style="font-size:1.05rem;line-height:1.6;margin:0 0 20px;color:#444;">${escapeHtml(
        hero.subheadline || "",
      )}</p>
      <a data-content-path="content.hero.cta" href="${escapeHtml(
        hero.ctaHref || "#",
      )}" style="display:inline-block;padding:12px 22px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">${escapeHtml(
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
        <h2 data-content-path="content.about.title" style="font-size:1.75rem;margin:0 0 12px;">${escapeHtml(
          about.title || "",
        )}</h2>
        <p data-content-path="content.about.body" style="margin:0;line-height:1.7;color:#444;white-space:pre-wrap;">${escapeHtml(
          about.body || "",
        )}</p>
      </div>
      ${
        img
          ? `<img data-content-path="content.about.imageId" data-media-id="${escapeHtml(
              about.imageId ?? "",
            )}" src="${escapeHtml(img)}" alt="${escapeHtml(
              imgAlt,
            )}" style="width:100%;border-radius:12px;display:block;" />`
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
      <h2${attr("data-content-path", titlePath)} style="font-size:1.75rem;margin:0 0 12px;">${escapeHtml(
        title,
      )}</h2>
      <div${attr(
        "data-content-path",
        bodyPath,
      )} style="color:#444;line-height:1.6;">${escapeHtml(body)}</div>
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
      return `<div data-product-index="${index}" style="border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">
        ${
          url
            ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(
                item.name,
              )}" style="width:100%;height:160px;object-fit:cover;display:block;" />`
            : `<div style="height:120px;background:#f3f3f3;"></div>`
        }
        <div style="padding:14px;">
          <h3 style="margin:0 0 6px;font-size:1rem;">${escapeHtml(item.name)}</h3>
          <p style="margin:0;color:#666;font-size:0.9rem;">${escapeHtml(
            item.description || "",
          )}</p>
        </div>
      </div>`;
    })
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2 data-content-path="content.products.title" style="font-size:1.75rem;margin:0 0 24px;text-align:center;">${escapeHtml(
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
    .map((id) => {
      const url = mediaUrl(config, id);
      if (!url) return "";
      return `<img data-media-id="${escapeHtml(id)}" src="${escapeHtml(
        url,
      )}" alt="${escapeHtml(
        mediaAlt(config, id),
      )}" style="width:100%;height:180px;object-fit:cover;border-radius:10px;display:block;" />`;
    })
    .filter(Boolean)
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:1100px;margin:0 auto;">
      <h2 data-content-path="content.gallery.title" style="font-size:1.75rem;margin:0 0 24px;text-align:center;">${escapeHtml(
        gallery?.title || "Gallery",
      )}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">${
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
    .map(
      (item) => `<blockquote style="margin:0;padding:20px;border:1px solid #eee;border-radius:12px;">
      <p style="margin:0 0 10px;line-height:1.6;">${escapeHtml(item.quote)}</p>
      <footer style="color:#666;font-size:0.9rem;">— ${escapeHtml(
        item.author,
      )}</footer>
    </blockquote>`,
    )
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:960px;margin:0 auto;">
      <h2 data-content-path="content.testimonials.title" style="font-size:1.75rem;margin:0 0 24px;text-align:center;">${escapeHtml(
        block?.title || "Testimonials",
      )}</h2>
      <div style="display:grid;gap:12px;">${items || "<p style='color:#888;'>No testimonials</p>"}</div>
    </div>`,
  );
}

function renderFaq(config: WebsiteConfig, section: SectionConfig): string {
  const faq = config.content.faq;
  const items = (faq?.items ?? [])
    .map(
      (item) => `<details style="border:1px solid #eee;border-radius:10px;padding:12px 14px;">
      <summary style="font-weight:550;cursor:pointer;">${escapeHtml(
        item.question,
      )}</summary>
      <p style="margin:10px 0 0;color:#555;line-height:1.6;">${escapeHtml(
        item.answer,
      )}</p>
    </details>`,
    )
    .join("");
  return sectionShell(
    section,
    `<div style="max-width:720px;margin:0 auto;">
      <h2 data-content-path="content.faq.title" style="font-size:1.75rem;margin:0 0 20px;text-align:center;">${escapeHtml(
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
      <h2 data-content-path="content.contact.title" style="font-size:1.75rem;margin:0 0 12px;text-align:center;">${escapeHtml(
        contact?.title || "Contact",
      )}</h2>
      <p data-content-path="content.contact.body" style="margin:0 0 16px;color:#444;line-height:1.6;text-align:center;">${escapeHtml(
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
      <p data-content-path="content.promo.kicker" style="margin:0 0 8px;opacity:0.8;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;">${escapeHtml(
        promo?.kicker || "",
      )}</p>
      <h2 data-content-path="content.promo.title" style="font-size:1.8rem;margin:0 0 16px;">${escapeHtml(
        promo?.title || "",
      )}</h2>
      <a data-content-path="content.promo.cta" href="${escapeHtml(
        promo?.ctaHref || "#",
      )}" style="display:inline-block;padding:12px 22px;background:#fff;color:#111;text-decoration:none;border-radius:8px;font-weight:550;">${escapeHtml(
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
      <p style="margin:0;font-size:0.9rem;">© ${escapeHtml(name)}</p>
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
      <span style="font-size:0.85rem;">Section preserved (visual preview limited in Phase 1)</span>
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
    default:
      return renderFallback(section);
  }
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
  return false;
}

export function buildProjectFromWebsiteConfig(
  config: WebsiteConfig,
): ProjectData {
  const dir = config.settings.direction === "rtl" ? "rtl" : "ltr";
  const lang = config.settings.language === "en" ? "en" : "fa";
  const bg = config.brand.colors.background || "#ffffff";
  const fg = config.brand.colors.foreground || "#111111";
  const sectionsHtml = config.sections
    .map((section) => renderSection(config, section))
    .join("\n");

  const body = `<body data-website-page="home" data-ve-source="website-config" dir="${dir}" lang="${lang}" style="margin:0;font-family:system-ui,-apple-system,sans-serif;color:${escapeHtml(
    fg,
  )};background:${escapeHtml(bg)};">
${
  sectionsHtml ||
  `<main style="padding:64px 24px;text-align:center;"><h1>${escapeHtml(
    config.brand.name || "Website",
  )}</h1><p style="color:#666;">Add sections in Classic Editor or drop blocks here.</p></main>`
}
</body>`;

  const assets = Object.entries(config.media).map(([id, media]) => ({
    type: media.type === "video" ? "video" : "image",
    src: media.url,
    name: media.alt || id,
    id,
  }));

  return {
    pages: [
      {
        id: "home",
        name: "Home",
        component: body,
      },
      ...(config.content.about?.title?.trim() || config.content.about?.body?.trim()
        ? [
            {
              id: "about",
              name: "About",
              component: `<body data-website-page="about" data-ve-source="website-config" dir="${dir}" lang="${lang}" style="margin:0;font-family:system-ui,-apple-system,sans-serif;color:${escapeHtml(
                fg,
              )};background:${escapeHtml(bg)};">
${renderAbout(
  config,
  config.sections.find((s) => s.type === "about") ?? {
    id: "about-page",
    type: "about" as const,
    visible: true,
  },
)}
</body>`,
            },
          ]
        : []),
    ],
    styles: [],
    assets,
  };
}
