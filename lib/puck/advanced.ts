/**
 * Advanced Puck field helpers: media external, list arrays, permissions, dictionary.
 */

import type { Fields, Permissions } from "@puckeditor/core";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import { createEntityId } from "@/lib/editor/ids";

export type FaqItemProp = { id?: string; question: string; answer: string };
export type TestimonialItemProp = {
  id?: string;
  quote: string;
  author: string;
};
export type GalleryImageProp = { id: string };
export type TrustItemProp = { text: string };

/** Project content lists / column slots onto Puck component props. */
export function listPropsFromContent(
  config: WebsiteConfig,
  section: SectionConfig,
): Record<string, unknown> {
  if (section.type === "faq") {
    return {
      items: (config.content.faq?.items ?? []).map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
      })),
    };
  }
  if (section.type === "testimonials") {
    return {
      items: (config.content.testimonials?.items ?? []).map((item) => ({
        id: item.id,
        quote: item.quote,
        author: item.author,
      })),
    };
  }
  if (section.type === "gallery") {
    return {
      images: (config.content.gallery?.imageIds ?? []).map((id) => ({ id })),
    };
  }
  if (section.type === "trust") {
    return {
      trustItems: (config.content.trust?.items ?? []).map((text) => ({ text })),
    };
  }
  if (section.type === "about") {
    return {
      richBody: config.content.about?.body ?? "",
      imageId: config.content.about?.imageId ?? "",
    };
  }
  if (section.type === "hero") {
    return {
      imageId: config.content.hero?.imageId ?? "",
    };
  }
  if (section.type === "columns") {
    return {
      left: Array.isArray(section.settings?.left) ? section.settings!.left : [],
      right: Array.isArray(section.settings?.right)
        ? section.settings!.right
        : [],
      gap:
        typeof section.settings?.gap === "string"
          ? section.settings.gap
          : "comfortable",
      ratio:
        typeof section.settings?.ratio === "string"
          ? section.settings.ratio
          : "1-1",
    };
  }
  return {};
}

/** Merge puck list / rich / media props back into WebsiteConfig.content */
export function applyListPropsToContent(
  content: WebsiteConfig["content"],
  sectionType: string,
  props: Record<string, unknown>,
): WebsiteConfig["content"] {
  if (sectionType === "faq" && Array.isArray(props.items)) {
    const items = (props.items as FaqItemProp[]).map((item) => ({
      id: item.id || createEntityId("faq"),
      question: String(item.question ?? ""),
      answer: String(item.answer ?? ""),
    }));
    return {
      ...content,
      faq: {
        title: content.faq?.title ?? "",
        items,
      },
    };
  }
  if (sectionType === "testimonials" && Array.isArray(props.items)) {
    const items = (props.items as TestimonialItemProp[]).map((item) => ({
      id: item.id || createEntityId("tst"),
      quote: String(item.quote ?? ""),
      author: String(item.author ?? ""),
    }));
    return {
      ...content,
      testimonials: {
        title: content.testimonials?.title ?? "",
        items,
      },
    };
  }
  if (sectionType === "gallery" && Array.isArray(props.images)) {
    return {
      ...content,
      gallery: {
        title: content.gallery?.title ?? "",
        imageIds: (props.images as GalleryImageProp[])
          .map((row) => String(row?.id ?? ""))
          .filter(Boolean),
      },
    };
  }
  if (sectionType === "trust" && Array.isArray(props.trustItems)) {
    return {
      ...content,
      trust: {
        items: (props.trustItems as TrustItemProp[]).map((row) =>
          String(row?.text ?? ""),
        ),
      },
    };
  }
  if (sectionType === "about") {
    const about = {
      title: content.about?.title ?? "",
      body: content.about?.body ?? "",
      imageId: content.about?.imageId,
    };
    if (typeof props.richBody === "string") about.body = props.richBody;
    if (typeof props.imageId === "string") {
      about.imageId = props.imageId || undefined;
    }
    return { ...content, about };
  }
  if (sectionType === "hero" && typeof props.imageId === "string") {
    return {
      ...content,
      hero: {
        ...content.hero,
        imageId: props.imageId || undefined,
      },
    };
  }
  return content;
}

/** Fold columns slot props into section.settings */
export function mergeColumnsSettings(
  settings: Record<string, unknown> | undefined,
  props: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const base = { ...(settings ?? {}) };
  if (Array.isArray(props.left)) base.left = props.left;
  if (Array.isArray(props.right)) base.right = props.right;
  if (typeof props.gap === "string") base.gap = props.gap;
  if (typeof props.ratio === "string") base.ratio = props.ratio;
  return Object.keys(base).length > 0 ? base : undefined;
}

export function faqArrayFields(locale: "fa" | "en"): Fields[string] {
  return {
    type: "array",
    label: locale === "fa" ? "سوالات" : "Questions",
    getItemSummary: (item: FaqItemProp, i = 0) =>
      item?.question?.trim() ||
      (locale === "fa" ? `سوال ${i + 1}` : `Question ${i + 1}`),
    defaultItemProps: { question: "", answer: "" },
    arrayFields: {
      question: {
        type: "text",
        label: locale === "fa" ? "سوال" : "Question",
        contentEditable: true,
      },
      answer: {
        type: "textarea",
        label: locale === "fa" ? "پاسخ" : "Answer",
        contentEditable: true,
      },
    },
  };
}

export function testimonialArrayFields(locale: "fa" | "en"): Fields[string] {
  return {
    type: "array",
    label: locale === "fa" ? "نظرات" : "Testimonials",
    getItemSummary: (item: TestimonialItemProp, i = 0) =>
      item?.author?.trim() ||
      (locale === "fa" ? `نظر ${i + 1}` : `Quote ${i + 1}`),
    defaultItemProps: { quote: "", author: "" },
    arrayFields: {
      quote: {
        type: "textarea",
        label: locale === "fa" ? "نقل‌قول" : "Quote",
        contentEditable: true,
      },
      author: {
        type: "text",
        label: locale === "fa" ? "نویسنده" : "Author",
        contentEditable: true,
      },
    },
  };
}

export function galleryImageArrayFields(
  locale: "fa" | "en",
  getConfig: () => WebsiteConfig,
): Fields[string] {
  const mediaField = buildMediaExternalField(locale, getConfig);
  return {
    type: "array",
    label: locale === "fa" ? "تصاویر" : "Images",
    getItemSummary: (item: GalleryImageProp, i = 0) => {
      const id = item?.id;
      if (!id) return locale === "fa" ? `تصویر ${i + 1}` : `Image ${i + 1}`;
      const alt = getConfig().media[id]?.alt;
      return alt || id;
    },
    defaultItemProps: { id: "" },
    arrayFields: {
      id: mediaField,
    },
  };
}

export function trustItemsArrayFields(locale: "fa" | "en"): Fields[string] {
  return {
    type: "array",
    label: locale === "fa" ? "موارد اعتماد" : "Trust items",
    getItemSummary: (item: TrustItemProp, i = 0) =>
      item?.text?.trim() ||
      (locale === "fa" ? `مورد ${i + 1}` : `Item ${i + 1}`),
    defaultItemProps: { text: "" },
    arrayFields: {
      text: {
        type: "text",
        label: locale === "fa" ? "متن" : "Text",
        contentEditable: true,
      },
    },
  };
}

/** Footer / system section permissions */
export function permissionsForSectionType(
  type: string,
): Partial<Permissions> | undefined {
  if (type === "footer") {
    return {
      delete: false,
      duplicate: false,
      drag: false,
      insert: false,
      edit: true,
    };
  }
  if (type === "hero") {
    return {
      delete: true,
      duplicate: false,
      drag: true,
      insert: true,
      edit: true,
    };
  }
  if (type === "columns") {
    return {
      delete: true,
      duplicate: true,
      drag: true,
      insert: true,
      edit: true,
    };
  }
  return undefined;
}

export const PUCK_DICTIONARY_FA: Record<string, string> = {
  "header-publish": "انتشار",
  "header-view-page": "مشاهده صفحه",
  "header-undo": "واگرد",
  "header-redo": "ازنو",
  "plugin-blocks": "بلوک‌ها",
  "plugin-outline": "ساختار",
  "plugin-fields": "فیلدها",
  "layout-maximize": "بیشینه",
  "layout-minimize": "کمینه",
};

export function buildMediaExternalField(
  locale: "fa" | "en",
  getConfig: () => WebsiteConfig,
): Fields[string] {
  return {
    type: "external",
    label: locale === "fa" ? "رسانه" : "Media",
    placeholder: locale === "fa" ? "انتخاب تصویر…" : "Select image…",
    showSearch: true,
    fetchList: async ({ query }) => {
      const config = getConfig();
      const q = (query ?? "").trim().toLowerCase();
      return Object.entries(config.media)
        .filter(([id, media]) => {
          if (!q) return true;
          return (
            id.toLowerCase().includes(q) ||
            (media.alt ?? "").toLowerCase().includes(q) ||
            (media.url ?? "").toLowerCase().includes(q)
          );
        })
        .map(([id, media]) => ({
          id,
          title: media.alt || id,
          url: media.url,
        }));
    },
    mapProp: (item: { id: string }) => item.id,
    mapRow: (item: { id: string; title?: string; url?: string }) => ({
      title: item.title ?? item.id,
      id: item.id,
    }),
    getItemSummary: (id: string) => {
      if (!id) return locale === "fa" ? "رسانه" : "Media";
      const alt = getConfig().media[id]?.alt;
      return alt || id;
    },
  };
}
