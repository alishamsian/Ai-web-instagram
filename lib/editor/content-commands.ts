/**
 * Content collection commands — products, services, FAQ, testimonials, gallery.
 * Pure, deterministic, fail-safe. UI must not manually splice arrays.
 */

import type { WebsiteConfig } from "@/types/website";
import type { Product, Service } from "@/types/ai";
import { type EditorCommandResult } from "@/lib/editor/types";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

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

// ── Products ──────────────────────────────────────────────

export function commandAddProduct(
  config: WebsiteConfig,
  seed?: Partial<Product>,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const id = newId("product");
  const item: Product = {
    id,
    slug: id,
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
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const index = products.items.findIndex(
    (item) => (item.id || item.slug) === productId,
  );
  if (index < 0) return null;
  const source = products.items[index]!;
  const id = newId("product");
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

export function commandReorderProduct(
  config: WebsiteConfig,
  fromIndex: number,
  toIndex: number,
): EditorCommandResult | null {
  const products = config.content.products;
  if (!products) return null;
  const items = moveIndex(products.items, fromIndex, toIndex);
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
  index: number,
  patch: Partial<Service>,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services || index < 0 || index >= services.items.length) return null;
  if (patch.imageIds) {
    for (const id of patch.imageIds) {
      if (!config.media[id]) return null;
    }
  }
  const items = [...services.items];
  items[index] = { ...items[index]!, ...patch };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        services: { ...services, items },
      },
    },
    label: `Edit service ${index}`,
  };
}

export function commandDeleteService(
  config: WebsiteConfig,
  index: number,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services || index < 0 || index >= services.items.length) return null;
  const items = services.items.filter((_, i) => i !== index);
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        services: { ...services, items },
      },
    },
    label: `Delete service ${index}`,
  };
}

export function commandReorderService(
  config: WebsiteConfig,
  fromIndex: number,
  toIndex: number,
): EditorCommandResult | null {
  const services = config.content.services;
  if (!services) return null;
  const items = moveIndex(services.items, fromIndex, toIndex);
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
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: {
          ...faq,
          items: [
            ...faq.items,
            { question: "New question", answer: "Answer" },
          ],
        },
      },
    },
    label: "Add FAQ item",
  };
}

export function commandUpdateFaqItem(
  config: WebsiteConfig,
  index: number,
  patch: Partial<{ question: string; answer: string }>,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq || index < 0 || index >= faq.items.length) return null;
  const items = [...faq.items];
  items[index] = { ...items[index]!, ...patch };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: { ...faq, items },
      },
    },
    label: `Edit FAQ ${index}`,
  };
}

export function commandDeleteFaqItem(
  config: WebsiteConfig,
  index: number,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq || index < 0 || index >= faq.items.length) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: {
          ...faq,
          items: faq.items.filter((_, i) => i !== index),
        },
      },
    },
    label: `Delete FAQ ${index}`,
  };
}

export function commandDuplicateFaqItem(
  config: WebsiteConfig,
  index: number,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq || index < 0 || index >= faq.items.length) return null;
  const items = [...faq.items];
  const copy = structuredClone(items[index]!);
  items.splice(index + 1, 0, copy);
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        faq: { ...faq, items },
      },
    },
    label: `Duplicate FAQ ${index}`,
  };
}

export function commandReorderFaqItem(
  config: WebsiteConfig,
  fromIndex: number,
  toIndex: number,
): EditorCommandResult | null {
  const faq = config.content.faq;
  if (!faq) return null;
  const items = moveIndex(faq.items, fromIndex, toIndex);
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

export function commandAddTestimonial(
  config: WebsiteConfig,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials) return null;
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: {
          ...testimonials,
          items: [
            ...testimonials.items,
            { quote: "New quote", author: "Author" },
          ],
        },
      },
    },
    label: "Add testimonial",
  };
}

export function commandUpdateTestimonial(
  config: WebsiteConfig,
  index: number,
  patch: Partial<{ quote: string; author: string }>,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials || index < 0 || index >= testimonials.items.length) {
    return null;
  }
  const items = [...testimonials.items];
  items[index] = { ...items[index]!, ...patch };
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: { ...testimonials, items },
      },
    },
    label: `Edit testimonial ${index}`,
  };
}

export function commandDeleteTestimonial(
  config: WebsiteConfig,
  index: number,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials || index < 0 || index >= testimonials.items.length) {
    return null;
  }
  return {
    config: {
      ...config,
      content: {
        ...config.content,
        testimonials: {
          ...testimonials,
          items: testimonials.items.filter((_, i) => i !== index),
        },
      },
    },
    label: `Delete testimonial ${index}`,
  };
}

export function commandReorderTestimonial(
  config: WebsiteConfig,
  fromIndex: number,
  toIndex: number,
): EditorCommandResult | null {
  const testimonials = config.content.testimonials;
  if (!testimonials) return null;
  const items = moveIndex(testimonials.items, fromIndex, toIndex);
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
  fromIndex: number,
  toIndex: number,
): EditorCommandResult | null {
  const gallery = config.content.gallery;
  if (!gallery) return null;
  const imageIds = moveIndex(gallery.imageIds, fromIndex, toIndex);
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
