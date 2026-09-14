/**
 * Content collection commands — products, services, FAQ, testimonials, gallery.
 * Pure state transforms. UI must not manually splice arrays.
 *
 * Identity: prefer stable item ids. Commands that create entities accept an
 * optional explicit `id` (deterministic). Otherwise `createEntityId` is used.
 */

import type { WebsiteConfig, FaqItem, TestimonialItem } from "@/types/website";
import type { Product, Service } from "@/types/ai";
import { type EditorCommandResult } from "@/lib/editor/types";
import { createEntityId } from "@/lib/editor/ids";

function moveIndex<T>(items: T[], from: number, to: number): T[] | null {
  if (
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length ||
    from === to
  ) {
    return null;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (!item) return null;
  next.splice(to, 0, item);
  return next;
}

function moveById<T extends { id?: string }>(
  items: T[],
  id: string,
  toIndex: number,
  resolveId: (item: T) => string | undefined = (item) => item.id,
): T[] | null {
  const from = items.findIndex((item) => resolveId(item) === id);
  if (from < 0) return null;
  return moveIndex(items, from, toIndex);
}

// ── Products ──────────────────────────────────────────────

export function commandAddProduct(
  config: WebsiteConfig,
  seed?: Partial<Product>,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const id = seed?.id ?? createEntityId("product");
  const item: Product = {
    id,
    slug: seed?.slug ?? id,
    name: seed?.name ?? "New product",
    description: seed?.description ?? "",
    category: seed?.category ?? products.defaults?.category ?? "General",
    price: seed?.price ?? null,
    currency: seed?.currency ?? products.defaults?.currency ?? null,
    imageIds: seed?.imageIds ?? [],
    confidence: 1,
    hidden: seed?.hidden ?? false,
  };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        products: { ...products, items: [...products.items, item] },
      },
    },
    label: "Add product",
  };
}

export function commandDeleteProduct(
  config: WebsiteConfig,
  productId: string,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const nextItems = products.items.filter(
    (item) => (item.id || item.slug) !== productId,
  );
  if (nextItems.length === products.items.length) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        products: { ...products, items: nextItems },
      },
    },
    label: `Delete product ${productId}`,
  };
}

export function commandDuplicateProduct(
  config: WebsiteConfig,
  productId: string,
  newId?: string,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const index = products.items.findIndex(
    (item) => (item.id || item.slug) === productId,
  );
  if (index < 0) return null;
  const source = products.items[index]!;
  const id = newId ?? createEntityId("product");
  const copy: Product = {
    ...structuredClone(source),
    id,
    slug: id,
    name: `${source.name} (copy)`,
  };
  const items = [...products.items];
  items.splice(index + 1, 0, copy);
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        products: { ...products, items },
      },
    },
    label: `Duplicate product ${productId}`,
  };
}

/** Reorder product by stable id to target index. */
export function commandReorderProduct(
  config: WebsiteConfig,
  productId: string,
  toIndex: number,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const items = moveById(
    products.items,
    productId,
    toIndex,
    (item) => item.id || item.slug,
  );
  if (!items) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        products: { ...products, items },
      },
    },
    label: "Reorder product",
  };
}

export type ProductPatch = Partial<
  Pick<
    Product,
    | "name"
    | "description"
    | "price"
    | "currency"
    | "category"
    | "hidden"
    | "imageIds"
  >
> & { imageId?: string | null };

/** Atomic product update — supports imageId OR full imageIds. */
export function commandUpdateProduct(
  config: WebsiteConfig,
  productId: string,
  patch: ProductPatch,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const index = products.items.findIndex(
    (item) => (item.id || item.slug) === productId,
  );
  if (index < 0) return null;
  const current = products.items[index]!;

  let imageIds = current.imageIds;
  if ("imageIds" in patch) {
    const nextIds = patch.imageIds ?? [];
    for (const id of nextIds) {
      if (!config.media[id]) return null;
    }
    imageIds = [...nextIds];
  } else if ("imageId" in patch) {
    if (patch.imageId != null && !config.media[patch.imageId]) return null;
    imageIds = patch.imageId
      ? [patch.imageId, ...current.imageIds.filter((id) => id !== patch.imageId)]
      : current.imageIds.slice(1);
  }

  const nextItem: Product = {
    ...current,
    imageIds,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.hidden !== undefined ? { hidden: patch.hidden } : {}),
  };

  const items = [...products.items];
  items[index] = nextItem;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        products: { ...products, items },
      },
    },
    label: `Edit product ${productId}`,
  };
}

// ── Services ──────────────────────────────────────────────

export function commandAddService(
  config: WebsiteConfig,
  seed?: Partial<Service>,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services) return null;
  const item: Service = {
    id: seed?.id ?? createEntityId("service"),
    name: seed?.name ?? "New service",
    description: seed?.description ?? "",
    imageIds: seed?.imageIds ?? [],
    confidence: 1,
  };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        services: { ...services, items: [...services.items, item] },
      },
    },
    label: "Add service",
  };
}

export function commandUpdateService(
  config: WebsiteConfig,
  serviceId: string,
  patch: Partial<Omit<Service, "id">>,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services) return null;
  const index = services.items.findIndex((item) => item.id === serviceId);
  if (index < 0) return null;
  if (patch.imageIds) {
    for (const id of patch.imageIds) {
      if (!config.media[id]) return null;
    }
  }
  const items = [...services.items];
  items[index] = { ...items[index]!, ...patch, id: serviceId };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        services: { ...services, items },
      },
    },
    label: `Edit service ${serviceId}`,
  };
}

export function commandDeleteService(
  config: WebsiteConfig,
  serviceId: string,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services) return null;
  const nextItems = services.items.filter((item) => item.id !== serviceId);
  if (nextItems.length === services.items.length) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        services: { ...services, items: nextItems },
      },
    },
    label: `Delete service ${serviceId}`,
  };
}

export function commandReorderService(
  config: WebsiteConfig,
  serviceId: string,
  toIndex: number,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services) return null;
  const items = moveById(services.items, serviceId, toIndex);
  if (!items) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        services: { ...services, items },
      },
    },
    label: "Reorder service",
  };
}

// ── FAQ ───────────────────────────────────────────────────

export function commandAddFaqItem(
  config: WebsiteConfig,
  seed?: Partial<FaqItem>,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  const item: FaqItem = {
    id: seed?.id ?? createEntityId("faq"),
    question: seed?.question ?? "New question",
    answer: seed?.answer ?? "Answer",
  };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: {
          ...faq,
          items: [...faq.items, item],
        },
      },
    },
    label: "Add FAQ item",
  };
}

export function commandUpdateFaqItem(
  config: WebsiteConfig,
  faqId: string,
  patch: Partial<Pick<FaqItem, "question" | "answer">>,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  const index = faq.items.findIndex((item) => item.id === faqId);
  if (index < 0) return null;
  const items = [...faq.items];
  items[index] = { ...items[index]!, ...patch, id: faqId };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: { ...faq, items },
      },
    },
    label: `Edit FAQ ${faqId}`,
  };
}

export function commandDeleteFaqItem(
  config: WebsiteConfig,
  faqId: string,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  const nextItems = faq.items.filter((item) => item.id !== faqId);
  if (nextItems.length === faq.items.length) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: { ...faq, items: nextItems },
      },
    },
    label: `Delete FAQ ${faqId}`,
  };
}

export function commandDuplicateFaqItem(
  config: WebsiteConfig,
  faqId: string,
  newId?: string,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  const index = faq.items.findIndex((item) => item.id === faqId);
  if (index < 0) return null;
  const items = [...faq.items];
  const copy: FaqItem = {
    ...structuredClone(items[index]!),
    id: newId ?? createEntityId("faq"),
  };
  items.splice(index + 1, 0, copy);
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: { ...faq, items },
      },
    },
    label: `Duplicate FAQ ${faqId}`,
  };
}

export function commandReorderFaqItem(
  config: WebsiteConfig,
  faqId: string,
  toIndex: number,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  const items = moveById(faq.items, faqId, toIndex);
  if (!items) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: { ...faq, items },
      },
    },
    label: "Reorder FAQ",
  };
}

// ── Testimonials ──────────────────────────────────────────

export function commandEnsureTestimonials(
  config: WebsiteConfig,
): EditorCommandResult {
  if (config.content.testimonials) {
    return { config, label: "Testimonials ready" };
  }
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: {
          title:
            config.settings.language === "fa"
              ? "نظر مشتریان"
              : "What clients say",
          items: [],
        },
      },
    },
    label: "Enable testimonials",
  };
}

export function commandAddTestimonial(
  config: WebsiteConfig,
  seed?: Partial<TestimonialItem>,
): EditorCommandResult | null {
  const base = config.content.testimonials
    ? config
    : commandEnsureTestimonials(config).config;
  const testimonials = base.content.testimonials;
  if (!testimonials) return null;
  const item: TestimonialItem = {
    id: seed?.id ?? createEntityId("testimonial"),
    quote: seed?.quote ?? "New quote",
    author: seed?.author ?? "Author",
  };
  return {
    config: {
      ...base,
      content: {
        ...base.content,
        testimonials: {
          ...testimonials,
          items: [...testimonials.items, item],
        },
      },
    },
    label: "Add testimonial",
  };
}

export function commandUpdateTestimonial(
  config: WebsiteConfig,
  testimonialId: string,
  patch: Partial<Pick<TestimonialItem, "quote" | "author">>,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials) return null;
  const index = testimonials.items.findIndex(
    (item) => item.id === testimonialId,
  );
  if (index < 0) return null;
  const items = [...testimonials.items];
  items[index] = { ...items[index]!, ...patch, id: testimonialId };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: { ...testimonials, items },
      },
    },
    label: `Edit testimonial ${testimonialId}`,
  };
}

export function commandDeleteTestimonial(
  config: WebsiteConfig,
  testimonialId: string,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials) return null;
  const nextItems = testimonials.items.filter(
    (item) => item.id !== testimonialId,
  );
  if (nextItems.length === testimonials.items.length) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: { ...testimonials, items: nextItems },
      },
    },
    label: `Delete testimonial ${testimonialId}`,
  };
}

export function commandReorderTestimonial(
  config: WebsiteConfig,
  testimonialId: string,
  toIndex: number,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials) return null;
  const items = moveById(testimonials.items, testimonialId, toIndex);
  if (!items) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: { ...testimonials, items },
      },
    },
    label: "Reorder testimonial",
  };
}

// ── Gallery ───────────────────────────────────────────────

export function commandSetGalleryImages(
  config: WebsiteConfig,
  imageIds: string[],
): EditorCommandResult | null {
  const gallery = config.content.gallery;
  if (!gallery) return null;
  for (const id of imageIds) {
    if (!config.media[id]) return null;
  }
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        gallery: { ...gallery, imageIds: [...imageIds] },
      },
    },
    label: "Update gallery images",
  };
}

export function commandToggleGalleryImage(
  config: WebsiteConfig,
  mediaId: string,
): EditorCommandResult | null {
  const gallery = config.content.gallery;
  if (!gallery) return null;
  if (!config.media[mediaId]) return null;
  const has = gallery.imageIds.includes(mediaId);
  const imageIds = has
    ? gallery.imageIds.filter((id) => id !== mediaId)
    : [...gallery.imageIds, mediaId];
  return commandSetGalleryImages(config, imageIds);
}

export function commandReorderGalleryImage(
  config: WebsiteConfig,
  mediaId: string,
  toIndex: number,
): EditorCommandResult | null {
  const gallery = config.content.gallery;
  if (!gallery) return null;
  const from = gallery.imageIds.indexOf(mediaId);
  if (from < 0) return null;
  const imageIds = moveIndex(gallery.imageIds, from, toIndex);
  if (!imageIds) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        gallery: { ...gallery, imageIds },
      },
    },
    label: "Reorder gallery",
  };
}

/** Helper: apply command result or no-op. */
export function applyCommandResult(
  result: EditorCommandResult | null,
  onChange: (next: WebsiteConfig) => void,
): boolean {
  if (!result) return false;
  onChange(result.config);
  return true;
}
