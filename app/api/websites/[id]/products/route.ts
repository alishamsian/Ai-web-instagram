import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { createId } from "@/lib/utils";
import { productSlug } from "@/lib/website/product";
import type { Product } from "@/types/ai";
import type { ProductSectionConfig } from "@/types/website";

type ProductPatch = {
  name?: string;
  price?: number | null;
  currency?: string | null;
  category?: string;
  description?: string;
  imageIds?: string[];
  hidden?: boolean;
};

type PostPayload = {
  id: string;
  caption?: string | null;
  displayUrl?: string | null;
  images?: string[];
  type?: string;
  videoUrl?: string | null;
  alt?: string | null;
};

function mergeProducts(keep: Product, others: Product[]): Product {
  const imageIds = [
    ...new Set([
      ...(keep.imageIds ?? []),
      ...others.flatMap((p) => p.imageIds ?? []),
    ]),
  ].slice(0, 12);
  const priced = [keep, ...others].find((p) => p.price != null);
  const withCat = [keep, ...others].find((p) => p.category?.trim());
  const withCur = [keep, ...others].find((p) => p.currency);
  const descriptions = [keep, ...others]
    .map((p) => p.description?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return {
    ...keep,
    id: keep.id || createId("prod"),
    imageIds,
    price: keep.price ?? priced?.price ?? null,
    currency: keep.currency ?? withCur?.currency ?? null,
    category: keep.category?.trim() ? keep.category : (withCat?.category ?? ""),
    description: keep.description?.trim()
      ? keep.description
      : (descriptions[0] ?? ""),
  };
}

function bumpVersion(
  site: {
    id: string;
    version: number;
    updatedAt: string;
    config: { content: { products?: ProductSectionConfig } };
  },
  store: { versions: unknown[] },
) {
  site.updatedAt = new Date().toISOString();
  site.version += 1;
  store.versions.push({
    id: createId("ver"),
    websiteId: site.id,
    version: site.version,
    config: structuredClone(site.config),
    createdAt: site.updatedAt,
  });
}

function ensureProductsSection(site: {
  config: {
    content: { products?: ProductSectionConfig };
    settings: { language: "fa" | "en" };
  };
}) {
  if (!site.config.content.products) {
    site.config.content.products = {
      title: site.config.settings.language === "fa" ? "محصولات" : "Products",
      items: [],
    };
  }
  return site.config.content.products;
}

function sectionDefaults(
  section: ProductSectionConfig,
  locale: "fa" | "en",
) {
  return {
    category: section.defaults?.category?.trim() || "",
    currency:
      section.defaults?.currency !== undefined
        ? section.defaults.currency?.trim() || null
        : locale === "fa"
          ? "IRT"
          : "USD",
  };
}

function nameFromCaption(caption: string | null | undefined, locale: "fa" | "en") {
  const line = caption?.trim().split("\n")[0]?.trim() ?? "";
  if (line) return line.slice(0, 80);
  return locale === "fa" ? "محصول جدید" : "New product";
}

function ensureMediaFromPost(
  media: Record<
    string,
    { url: string; alt: string; type: "image" | "video"; videoUrl?: string | null }
  >,
  post: PostPayload,
) {
  const url = post.displayUrl || post.images?.[0];
  if (!url && !post.videoUrl) return null;
  const isVideo =
    post.type === "video" || post.type === "reel" || Boolean(post.videoUrl);
  if (!media[post.id]) {
    media[post.id] = {
      url: url ?? post.videoUrl!,
      alt: (post.alt || post.caption || post.id).slice(0, 120),
      type: isVideo ? "video" : "image",
      videoUrl: post.videoUrl ?? null,
    };
  }
  return post.id;
}

function applyPatch(item: Product, patch: ProductPatch) {
  if (patch.name != null) item.name = patch.name.trim().slice(0, 120);
  if (patch.category != null) item.category = patch.category.trim().slice(0, 80);
  if (patch.description != null) {
    item.description = patch.description.trim().slice(0, 500);
  }
  if ("price" in patch) {
    item.price =
      patch.price == null || Number.isNaN(Number(patch.price))
        ? null
        : Number(patch.price);
  }
  if ("currency" in patch) {
    item.currency = patch.currency?.trim() || null;
  }
  if (patch.imageIds) {
    item.imageIds = patch.imageIds.slice(0, 12);
  }
  if (typeof patch.hidden === "boolean") {
    item.hidden = patch.hidden;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;
  const website = await getWebsiteForWorkspace(id, session.workspace.id);
  if (!website) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    action?:
      | "update"
      | "reorder"
      | "create"
      | "delete"
      | "bulk"
      | "bulkPatch"
      | "fromPost"
      | "attachMedia"
      | "setDefaults"
      | "merge";
    index?: number;
    indices?: number[];
    keepIndex?: number;
    mergeIndices?: number[];
    keepId?: string;
    mergeIds?: string[];
    fromIndex?: number;
    toIndex?: number;
    product?: ProductPatch;
    patches?: Array<{ index: number; product: ProductPatch }>;
    defaults?: { category?: string; currency?: string | null };
    post?: PostPayload;
    imageId?: string;
    append?: boolean;
    mediaUrl?: string;
    mediaAlt?: string;
  };

  const action = body.action ?? "update";
  let nextVersion: number | null = null;
  let createdIndex: number | null = null;
  let keptIndex: number | null = null;
  let errorCode: string | null = null;

  try {
  await writeStore((store) => {
    const site = store.websites.find(
      (item) => item.id === id && item.workspaceId === session.workspace.id,
    );
    if (!site) {
      errorCode = "SITE_NOT_FOUND";
      return;
    }
    const locale = site.config.settings.language;
    const section = ensureProductsSection(site);
    const products = section.items;
    const defaults = sectionDefaults(section, locale);

    if (action === "setDefaults") {
      section.defaults = {
        category: body.defaults?.category?.trim() || "",
        currency:
          body.defaults && "currency" in body.defaults
            ? body.defaults.currency?.trim() || null
            : defaults.currency,
      };
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "merge") {
      const resolveIndex = (value: {
        index?: number;
        id?: string;
      }): number => {
        if (typeof value.id === "string" && value.id) {
          const byId = products.findIndex((p) => p.id === value.id);
          if (byId >= 0) return byId;
        }
        const index = Number(value.index);
        if (Number.isInteger(index) && index >= 0 && index < products.length) {
          return index;
        }
        return -1;
      };

      // Ensure every product has a stable id before resolving targets.
      for (const product of products) {
        if (!product.id) product.id = createId("prod");
      }

      const keep = resolveIndex({
        index: body.keepIndex,
        id: body.keepId,
      });

      const fromIds = (body.mergeIds ?? [])
        .map((mergeId) => resolveIndex({ id: mergeId }))
        .filter((i) => i >= 0);
      const fromIndices = (body.mergeIndices ?? [])
        .map((i) => Number(i))
        .filter(
          (i) => Number.isInteger(i) && i >= 0 && i < products.length,
        );
      const mergeIndices = [...new Set([...fromIds, ...fromIndices])]
        .filter((i) => i !== keep)
        .sort((a, b) => b - a);

      if (keep < 0 || !mergeIndices.length) {
        errorCode = "MERGE_TARGETS_MISSING";
        return;
      }

      const others = mergeIndices.map((i) => products[i]!);
      products[keep] = mergeProducts(products[keep]!, others);
      for (const i of mergeIndices) products.splice(i, 1);
      let adjusted = keep;
      for (const i of mergeIndices) {
        if (i < keep) adjusted -= 1;
      }
      keptIndex = adjusted;
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "create") {
      const index = products.length;
      const idNew = createId("prod");
      const name =
        body.product?.name?.trim() ||
        (locale === "fa" ? `محصول ${index + 1}` : `Product ${index + 1}`);
      const item: Product = {
        id: idNew,
        slug: productSlug(name, index, idNew),
        name,
        description: body.product?.description?.trim() || "",
        category: body.product?.category?.trim() || defaults.category,
        price:
          body.product?.price == null || Number.isNaN(Number(body.product.price))
            ? null
            : Number(body.product.price),
        currency:
          body.product?.currency?.trim() ||
          defaults.currency ||
          (locale === "fa" ? "IRT" : "USD"),
        imageIds: body.product?.imageIds ?? [],
        confidence: 0.5,
        hidden: false,
      };
      products.push(item);
      createdIndex = products.length - 1;
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "fromPost") {
      const post = body.post;
      if (!post?.id) return;
      const mediaId = ensureMediaFromPost(site.config.media, post);
      const index = products.length;
      const name = nameFromCaption(post.caption, locale);
      const idNew = createId("prod");
      const item: Product = {
        id: idNew,
        slug: productSlug(name, index, idNew),
        name,
        description: (post.caption ?? "").trim().slice(0, 500),
        category: defaults.category,
        price: null,
        currency: defaults.currency || (locale === "fa" ? "IRT" : "USD"),
        imageIds: mediaId ? [mediaId] : [],
        confidence: 0.6,
        hidden: false,
      };
      products.push(item);
      createdIndex = products.length - 1;
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "reorder") {
      const from = body.fromIndex;
      const to = body.toIndex;
      if (
        typeof from !== "number" ||
        typeof to !== "number" ||
        from < 0 ||
        to < 0 ||
        from >= products.length ||
        to >= products.length
      ) {
        return;
      }
      const [moved] = products.splice(from, 1);
      if (!moved) return;
      products.splice(to, 0, moved);
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "delete") {
      const indices = (
        body.indices?.length
          ? body.indices
          : typeof body.index === "number"
            ? [body.index]
            : []
      )
        .filter((i) => i >= 0 && i < products.length)
        .sort((a, b) => b - a);
      if (!indices.length) return;
      for (const i of indices) products.splice(i, 1);
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "bulk") {
      const indices = (body.indices ?? []).filter(
        (i) => i >= 0 && i < products.length,
      );
      if (!indices.length || !body.product) return;
      for (const i of indices) {
        applyPatch(products[i]!, body.product);
      }
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "bulkPatch") {
      const patches = (body.patches ?? []).filter(
        (p) =>
          typeof p?.index === "number" &&
          p.index >= 0 &&
          p.index < products.length &&
          p.product,
      );
      if (!patches.length) return;
      for (const patch of patches) {
        applyPatch(products[patch.index]!, patch.product);
      }
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    if (action === "attachMedia") {
      if (
        typeof body.index !== "number" ||
        body.index < 0 ||
        !products[body.index] ||
        !body.imageId
      ) {
        return;
      }
      if (body.mediaUrl && !site.config.media[body.imageId]) {
        site.config.media[body.imageId] = {
          url: body.mediaUrl,
          alt: (body.mediaAlt || body.imageId).slice(0, 120),
          type: "image",
        };
      }
      const item = products[body.index]!;
      if (body.append) {
        if (!item.imageIds.includes(body.imageId)) {
          item.imageIds = [...item.imageIds, body.imageId].slice(0, 12);
        }
      } else {
        item.imageIds = [
          body.imageId,
          ...item.imageIds.filter((x) => x !== body.imageId),
        ].slice(0, 12);
      }
      bumpVersion(site, store);
      nextVersion = site.version;
      return;
    }

    // update
    if (
      typeof body.index !== "number" ||
      body.index < 0 ||
      !products[body.index] ||
      !body.product?.name?.trim()
    ) {
      return;
    }
    applyPatch(products[body.index]!, body.product);
    bumpVersion(site, store);
    nextVersion = site.version;
  });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Write failed";
    console.error("[products] write failed", message, error);
    return NextResponse.json(
      { error: "WRITE_FAILED", message },
      { status: 500 },
    );
  }

  if (nextVersion == null) {
    return NextResponse.json(
      { error: errorCode ?? "INVALID_BODY" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    version: nextVersion,
    createdIndex,
    keptIndex,
  });
}
