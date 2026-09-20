/**
 * Template → WebsiteConfig instantiation.
 * Deep-independent clones; pages/sections get stable mapped IDs.
 * Phase 3.1: canonical content collections + page-local sections.
 */

import type { ProjectData } from "grapesjs";
import type {
  SectionConfig,
  WebsiteConfig,
  WebsitePage,
} from "@/types/website";
import { createBlockHtml, nextSectionId } from "@/lib/visual-editor/registry";
import { mergePreservedIntoHtml } from "@/lib/visual-editor/variants/switch";
import { hrefForPageSlug } from "@/lib/visual-editor/pages";
import { buildProjectFromWebsiteConfig } from "@/lib/visual-editor/project-from-config";
import { getTemplate } from "@/lib/templates/registry";
import { buildCanonicalTemplateContent } from "@/lib/templates/canonical-content";
import {
  sectionTypeFromBlockId,
  TEMPLATE_SCHEMA_VERSION,
  type InstantiateTemplateOptions,
  type InstantiateTemplateResult,
  type TemplatePageDef,
  type TemplateSectionDef,
  type WebsiteTemplate,
} from "@/lib/templates/types";

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function resolveWebsitePageId(templatePageId: string): string {
  if (templatePageId === "home") return "home";
  if (templatePageId === "about") return "about";
  return templatePageId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function allocateSectionId(
  blockId: string,
  existing: string[],
  key: string,
): string {
  const type = sectionTypeFromBlockId(blockId) || key;
  return nextSectionId(type, existing);
}

function applySectionContent(
  html: string,
  section: TemplateSectionDef,
): string {
  if (!section.content) return html;
  const preserved = Object.entries(section.content).map(([role, text]) => ({
    role,
    text,
    contentPath:
      role === "headline"
        ? "content.hero.headline"
        : role === "subheadline"
          ? "content.hero.subheadline"
          : role === "cta" && section.blockId === "section-hero"
            ? "content.hero.cta"
            : role === "title" && section.blockId === "section-about"
              ? "content.about.title"
              : role === "body" && section.blockId === "section-about"
                ? "content.about.body"
                : role === "title" && section.blockId === "section-cta"
                  ? "content.promo.title"
                  : role === "cta" && section.blockId === "section-cta"
                    ? "content.promo.cta"
                    : role === "title" && section.blockId === "section-contact"
                      ? "content.contact.title"
                      : role === "body" && section.blockId === "section-contact"
                        ? "content.contact.body"
                        : role === "title" &&
                            section.blockId === "section-pricing"
                          ? "content.pricing.title"
                          : role === "title" &&
                              section.blockId === "section-menu"
                            ? "content.menu.title"
                            : role === "title" &&
                                section.blockId === "section-lookbook"
                              ? "content.lookbook.title"
                              : role === "title" &&
                                  section.blockId === "section-portfolio"
                                ? "content.portfolio.title"
                                : role === "title" &&
                                    section.blockId === "section-properties"
                                  ? "content.properties.title"
                                  : role === "title" &&
                                      section.blockId === "section-location"
                                    ? "content.location.title"
                                    : undefined,
  }));
  return mergePreservedIntoHtml(html, preserved);
}

function buildSectionsForPage(
  page: TemplatePageDef,
  websitePageId: string,
  locale: "fa" | "en",
  colors: WebsiteConfig["brand"]["colors"],
  existingSectionIds: string[],
): { sections: SectionConfig[]; sectionIds: string[]; htmlParts: string[] } {
  const sectionIds: string[] = [];
  const sections: SectionConfig[] = [];
  const htmlParts: string[] = [];

  for (const section of page.sections) {
    const sectionId = allocateSectionId(
      section.blockId,
      [...existingSectionIds, ...sectionIds],
      section.key,
    );
    sectionIds.push(sectionId);
    const { html } = createBlockHtml(section.blockId, {
      locale,
      pageId: websitePageId,
      sectionId,
      variantId: section.variant,
      colors,
    });
    htmlParts.push(applySectionContent(html, section));

    const type = sectionTypeFromBlockId(section.blockId);
    if (type) {
      sections.push({
        id: sectionId,
        type,
        visible: true,
        variant: section.variant,
      });
    }
  }

  return { sections, sectionIds, htmlParts };
}

function buildNavHtml(
  template: WebsiteTemplate,
  pageIdMap: Record<string, string>,
  pages: WebsitePage[],
  locale: "fa" | "en",
  brandName: string,
): string {
  const links = template.navigation
    .map((item) => {
      const websitePageId = pageIdMap[item.pageId];
      const meta = pages.find((p) => p.id === websitePageId);
      if (!meta) return "";
      const href = hrefForPageSlug(meta.slug);
      const label = locale === "fa" ? item.label.fa : item.label.en;
      return `<a href="${href}" data-nav-page-id="${websitePageId}" style="color:inherit;text-decoration:none;font-size:0.9rem;">${label}</a>`;
    })
    .filter(Boolean)
    .join("");

  return `<header data-component-type="template-nav" data-page-id="shared" style="padding:16px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid rgba(0,0,0,0.08);">
  <strong style="font-size:1rem;">${brandName}</strong>
  <nav style="display:flex;flex-wrap:wrap;gap:16px;">${links}</nav>
</header>`;
}

function buildHomeContent(
  template: WebsiteTemplate,
  locale: "fa" | "en",
  brandName: string,
): WebsiteConfig["content"] {
  const home = template.pages.find((p) => p.kind === "home");
  const heroSec = home?.sections.find((s) => s.blockId === "section-hero");
  const aboutSec = home?.sections.find((s) => s.blockId === "section-about");
  const ctaSec = home?.sections.find((s) => s.blockId === "section-cta");
  const contactSec = home?.sections.find(
    (s) =>
      s.blockId === "section-contact" || s.blockId === "section-reservations",
  );

  return {
    hero: {
      style:
        (heroSec?.variant as WebsiteConfig["content"]["hero"]["style"]) ||
        "minimal",
      headline: heroSec?.content?.headline || brandName,
      subheadline:
        heroSec?.content?.subheadline ||
        template.brand.tagline ||
        (locale === "fa"
          ? "ویترین آماده سفارشی‌سازی"
          : "A ready storefront to customize"),
      cta:
        heroSec?.content?.cta || (locale === "fa" ? "شروع" : "Get started"),
    },
    about: {
      title: aboutSec?.content?.title || (locale === "fa" ? "درباره" : "About"),
      body:
        aboutSec?.content?.body ||
        (locale === "fa"
          ? "داستان برند را اینجا بنویسید."
          : "Tell your brand story here."),
    },
    promo: {
      kicker: "",
      title:
        ctaSec?.content?.title ||
        (locale === "fa" ? "آماده هستید؟" : "Ready when you are"),
      cta: ctaSec?.content?.cta || (locale === "fa" ? "تماس" : "Contact"),
    },
    contact: {
      title:
        contactSec?.content?.title || (locale === "fa" ? "تماس" : "Contact"),
      body:
        contactSec?.content?.body ||
        (locale === "fa"
          ? "با ما در ارتباط باشید."
          : "Get in touch with us."),
      info: {
        phone: null,
        email: null,
        website: null,
        instagram: null,
        telegram: null,
        whatsapp: null,
        address: null,
        location: null,
      },
    },
  };
}

/**
 * Instantiate a registered template into an independent WebsiteConfig.
 */
export function instantiateTemplate(
  templateId: string,
  options: InstantiateTemplateOptions = {},
): InstantiateTemplateResult {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }
  return instantiateTemplateDefinition(template, options);
}

export function instantiateTemplateDefinition(
  template: WebsiteTemplate,
  options: InstantiateTemplateOptions = {},
): InstantiateTemplateResult {
  const locale = options.locale || options.language || "en";
  const language = options.language || locale;
  const direction =
    options.direction || (language === "fa" ? "rtl" : "ltr");
  const brandName =
    options.brandName?.trim() ||
    (locale === "fa" ? template.name.fa : template.name.en);

  const pageIdMap: Record<string, string> = {};
  for (const p of template.pages) {
    pageIdMap[p.id] = resolveWebsitePageId(p.id);
  }

  const brand = deepClone(template.brand);
  const baseContent = buildHomeContent(template, locale, brandName);
  const { content, media } = buildCanonicalTemplateContent(
    template,
    locale,
    brandName,
    baseContent,
  );

  const allSectionIds: string[] = [];
  let homeSections: SectionConfig[] = [];
  const pages: WebsitePage[] = [];

  // First pass: allocate sections per page
  const pageBuilds = template.pages.map((page) => {
    const websitePageId = pageIdMap[page.id];
    const built = buildSectionsForPage(
      page,
      websitePageId,
      locale,
      brand.colors,
      allSectionIds,
    );
    allSectionIds.push(...built.sectionIds);
    if (page.kind === "home") {
      homeSections = built.sections;
    }
    return { page, websitePageId, built };
  });

  for (const { page, websitePageId, built } of pageBuilds) {
    pages.push({
      id: websitePageId,
      slug: page.kind === "home" ? "" : page.slug,
      name: locale === "fa" ? page.name.fa : page.name.en,
      title: page.title
        ? locale === "fa"
          ? page.title.fa
          : page.title.en
        : undefined,
      description: page.description
        ? locale === "fa"
          ? page.description.fa
          : page.description.en
        : undefined,
      kind: page.kind,
      sections: deepClone(built.sections),
    });
  }

  // Draft config then rebuild visual project from canonical WebsiteConfig
  const draft: WebsiteConfig = {
    template: template.legacyTemplate,
    brand: {
      name: brandName,
      tagline: brand.tagline,
      colors: brand.colors,
      typography: brand.typography,
      design: brand.design,
    },
    content,
    sections: homeSections,
    seo: {
      title: brandName.slice(0, 60),
      description: (
        (locale === "fa" ? template.description.fa : template.description.en) ||
        brandName
      ).slice(0, 155),
      keywords: [...template.tags],
    },
    settings: {
      language,
      direction,
      showBranding: true,
      published: false,
      vertical: template.metadata?.industry ?? null,
    },
    media,
    pages,
    visualEditor: {
      engine: "grapesjs",
      version: 2,
      project: { pages: [], styles: [], assets: [] } as ProjectData as never,
      activePageId: "home",
    },
    templateCatalogId: template.id,
    templateSchemaVersion: TEMPLATE_SCHEMA_VERSION,
  };

  const project = buildProjectFromWebsiteConfig(draft);
  // Prepend shared nav into each projected page for editor UX
  const navHtml = buildNavHtml(template, pageIdMap, pages, locale, brandName);
  if (project.pages) {
    project.pages = project.pages.map((p: { id?: string; component?: unknown; [key: string]: unknown }) => {
      const component =
        typeof p.component === "string" ? p.component : "";
      const withNav = component.replace(
        /(<body[^>]*>)/i,
        `$1\n${navHtml}\n`,
      );
      return { ...p, component: withNav };
    });
  }

  draft.visualEditor = {
    engine: "grapesjs",
    version: 2,
    project: project as never,
    activePageId: "home",
  };

  return {
    config: deepClone(draft),
    pageIdMap: { ...pageIdMap },
    templateId: template.id,
  };
}

/** Remap internal nav hrefs when page slugs change — identity stays page id. */
export function resolveNavHrefForPageId(
  config: WebsiteConfig,
  pageId: string,
): string {
  const page = config.pages?.find((p) => p.id === pageId);
  if (!page) return "/";
  return hrefForPageSlug(page.slug);
}
