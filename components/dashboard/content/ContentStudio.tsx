"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Package,
  Percent,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteImage } from "@/components/website/SiteImage";
import {
  BulkFocusReview,
  type ReviewField,
} from "@/components/dashboard/content/BulkFocusReview";
import { DuplicatesPanel } from "@/components/dashboard/content/DuplicatesPanel";
import {
  MediaUploadZone,
  type UploadedMediaItem,
} from "@/components/dashboard/content/MediaUploadZone";
import {
  catalogHealth,
  extractPriceFromText,
  findDuplicateGroups,
  healthLabel,
  mediaUrl,
  mergeProductData,
  productHealth,
  suggestCategory,
  type CatalogDefaults,
  type ProductHealth,
  type StudioProduct,
} from "@/components/dashboard/content/catalog-utils";
import { cn } from "@/lib/utils";

type Tab = "products" | "instagram" | "media";
type Filter = "all" | "ready" | "no_price" | "no_image" | "hidden";

type PostCard = {
  id: string;
  type: string;
  caption: string | null;
  displayUrl: string | null;
  images: string[];
  videoUrl?: string | null;
  alt?: string | null;
  username: string;
};

type MediaCard = {
  id: string;
  url: string;
  type?: "image" | "video" | string;
  username?: string;
};

export function ContentStudio({
  websiteId,
  brandName,
  locale,
  products: initialProducts,
  mediaMap,
  posts,
  mediaLibrary,
  previewBase,
  catalogDefaults: initialDefaults,
}: {
  websiteId: string;
  brandName: string;
  locale: "fa" | "en";
  products: StudioProduct[];
  mediaMap: Record<string, { url: string; type?: string }>;
  posts: PostCard[];
  mediaLibrary: MediaCard[];
  previewBase: string;
  catalogDefaults?: CatalogDefaults;
}) {
  const isFa = locale === "fa";
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void router.refresh();
    }, 1200);
  }, [router]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  const [tab, setTab] = useState<Tab>("products");
  const [items, setItems] = useState(initialProducts);
  const [media, setMedia] = useState(mediaMap);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [reviewQueue, setReviewQueue] = useState<number[] | null>(null);
  const [reviewField, setReviewField] = useState<ReviewField>("price");
  const [bulkTool, setBulkTool] = useState<"category" | "currency" | "price" | null>(
    null,
  );
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkCurrency, setBulkCurrency] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [pricePercent, setPricePercent] = useState("10");
  const [showDefaults, setShowDefaults] = useState(false);
  const [showDupes, setShowDupes] = useState(true);
  const [libraryExtra, setLibraryExtra] = useState<MediaCard[]>([]);
  const [defaults, setDefaults] = useState<CatalogDefaults>(
    initialDefaults ?? {
      category: "",
      currency: locale === "fa" ? "IRT" : "USD",
    },
  );
  const [draftCategory, setDraftCategory] = useState(defaults.category);
  const [draftCurrency, setDraftCurrency] = useState(defaults.currency ?? "");

  useEffect(() => {
    setItems(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setMedia(mediaMap);
  }, [mediaMap]);

  useEffect(() => {
    if (!initialDefaults) return;
    setDefaults(initialDefaults);
    setDraftCategory(initialDefaults.category);
    setDraftCurrency(initialDefaults.currency ?? "");
  }, [initialDefaults]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const health = useMemo(() => catalogHealth(items), [items]);
  const readyRatio =
    health.visible > 0 ? Math.round((health.ready / health.visible) * 100) : 0;
  const duplicateGroups = useMemo(() => findDuplicateGroups(items), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => {
        const h = productHealth(product);
        if (filter === "ready" && h !== "ready") return false;
        if (filter === "no_price" && product.price != null) return false;
        if (filter === "no_image" && product.imageIds?.length) return false;
        if (filter === "hidden" && !product.hidden) return false;
        if (filter === "all" && product.hidden) return false;
        if (!q) return true;
        return (
          product.name.toLowerCase().includes(q) ||
          product.category?.toLowerCase().includes(q) ||
          product.description?.toLowerCase().includes(q)
        );
      });
  }, [items, query, filter]);

  const api = useCallback(
    async (body: Record<string, unknown>) => {
      setPending(true);
      const response = await fetch(`/api/websites/${websiteId}/products`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      setPending(false);
      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        console.error("[content] product action failed", body.action, err);
        setToast(
          isFa
            ? err?.error === "MERGE_TARGETS_MISSING"
              ? "محصول‌ها پیدا نشد — صفحه را تازه کن."
              : "عملیات ناموفق بود."
            : err?.error === "MERGE_TARGETS_MISSING"
              ? "Products not found — refresh the page."
              : "Action failed.",
        );
        return null;
      }
      const payload = (await response.json()) as {
        createdIndex?: number | null;
      };
      scheduleRefresh();
      return payload;
    },
    [websiteId, isFa, scheduleRefresh],
  );

  async function saveProduct(index: number, product: StudioProduct) {
    const result = await api({
      action: "update",
      index,
      product: {
        name: product.name,
        price: product.price,
        currency: product.currency,
        category: product.category,
        description: product.description,
        imageIds: product.imageIds,
        hidden: product.hidden ?? false,
      },
    });
    if (result) {
      setItems((prev) => prev.map((p, i) => (i === index ? product : p)));
      setToast(isFa ? "ذخیره شد" : "Saved");
    }
  }

  async function createProduct() {
    const result = await api({ action: "create" });
    if (result?.createdIndex != null) {
      setTab("products");
      setEditing(result.createdIndex);
      setToast(isFa ? "محصول اضافه شد" : "Product added");
    }
  }

  async function fromPost(post: PostCard) {
    const result = await api({
      action: "fromPost",
      post: {
        id: post.id,
        caption: post.caption,
        displayUrl: post.displayUrl,
        images: post.images,
        type: post.type,
        videoUrl: post.videoUrl,
        alt: post.alt,
      },
    });
    if (result?.createdIndex != null) {
      if (post.displayUrl || post.images[0]) {
        setMedia((prev) => ({
          ...prev,
          [post.id]: {
            url: post.displayUrl || post.images[0]!,
            type:
              post.type === "reel" || post.type === "video" ? "video" : "image",
          },
        }));
      }
      setTab("products");
      setEditing(result.createdIndex);
      setToast(isFa ? "از پست ساخته شد" : "Created from post");
    }
  }

  async function attachToProduct(post: PostCard, productIndex: number) {
    const imageId = post.id;
    if (post.displayUrl || post.images[0]) {
      setMedia((prev) => ({
        ...prev,
        [post.id]: {
          url: post.displayUrl || post.images[0]!,
          type: "image",
        },
      }));
    }
    const result = await api({
      action: "attachMedia",
      index: productIndex,
      imageId,
      append: true,
      mediaUrl: post.displayUrl || post.images[0],
      mediaAlt: post.caption,
    });
    if (result) {
      setItems((prev) =>
        prev.map((p, i) =>
          i === productIndex
            ? {
                ...p,
                imageIds: p.imageIds.includes(imageId)
                  ? p.imageIds
                  : [...p.imageIds, imageId].slice(0, 12),
              }
            : p,
        ),
      );
      setEditing(productIndex);
      setTab("products");
      setToast(isFa ? "عکس وصل شد" : "Image attached");
    }
  }

  async function reorder(from: number, to: number) {
    if (from === to) return;
    const previous = items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setItems(next);
    if (editing === from) setEditing(to);
    const result = await api({
      action: "reorder",
      fromIndex: from,
      toIndex: to,
    });
    if (!result) setItems(previous);
  }

  async function bulk(patch: {
    hidden?: boolean;
    category?: string;
    currency?: string | null;
    price?: number | null;
    delete?: boolean;
  }) {
    const indices = [...selected].sort((a, b) => a - b);
    if (!indices.length) return;
    if (patch.delete) {
      const result = await api({ action: "delete", indices });
      if (result) {
        setSelected(new Set());
        setEditing(null);
        setBulkTool(null);
        setToast(isFa ? "حذف شد" : "Deleted");
      }
      return;
    }
    const result = await api({
      action: "bulk",
      indices,
      product: patch,
    });
    if (result) {
      setItems((prev) =>
        prev.map((p, i) =>
          selected.has(i)
            ? {
                ...p,
                ...(typeof patch.hidden === "boolean"
                  ? { hidden: patch.hidden }
                  : {}),
                ...(patch.category != null ? { category: patch.category } : {}),
                ...(patch.currency !== undefined
                  ? { currency: patch.currency }
                  : {}),
                ...(patch.price !== undefined ? { price: patch.price } : {}),
              }
            : p,
        ),
      );
      setSelected(new Set());
      setBulkTool(null);
      setToast(isFa ? "به‌روز شد" : "Updated");
    }
  }

  async function commitPatches(
    patches: Array<{ index: number; product: Partial<StudioProduct> }>,
  ) {
    if (!patches.length) return true;
    const result = await api({
      action: "bulkPatch",
      patches: patches.map(({ index, product }) => ({
        index,
        product: {
          name: product.name,
          price: product.price,
          currency: product.currency,
          category: product.category,
          description: product.description,
          imageIds: product.imageIds,
          hidden: product.hidden,
        },
      })),
    });
    if (!result) return false;
    setItems((prev) =>
      prev.map((p, i) => {
        const patch = patches.find((x) => x.index === i);
        return patch ? { ...p, ...patch.product } : p;
      }),
    );
    setToast(isFa ? "ذخیره شد" : "Saved");
    return true;
  }

  async function applyPricePercent(percent: number) {
    const indices = [...selected].sort((a, b) => a - b);
    if (!indices.length) return;
    const patches = indices
      .map((index) => {
        const p = items[index];
        if (!p || p.price == null) return null;
        const next = Math.round(p.price * (1 + percent / 100));
        return { index, product: { price: next } };
      })
      .filter(Boolean) as Array<{
      index: number;
      product: Partial<StudioProduct>;
    }>;
    if (!patches.length) {
      setToast(
        isFa ? "هیچ قیمتی برای تغییر نبود" : "No priced items to adjust",
      );
      return;
    }
    const ok = await commitPatches(patches);
    if (ok) {
      setSelected(new Set());
      setBulkTool(null);
    }
  }

  async function roundSelectedPrices() {
    const indices = [...selected].sort((a, b) => a - b);
    const step = locale === "fa" ? 1000 : 1;
    const patches = indices
      .map((index) => {
        const p = items[index];
        if (!p || p.price == null) return null;
        const next = Math.round(p.price / step) * step;
        return { index, product: { price: next } };
      })
      .filter(Boolean) as Array<{
      index: number;
      product: Partial<StudioProduct>;
    }>;
    if (!patches.length) return;
    const ok = await commitPatches(patches);
    if (ok) {
      setSelected(new Set());
      setBulkTool(null);
    }
  }

  function startReview(
    indices: number[],
    field: ReviewField = "price",
  ) {
    const queue = [...new Set(indices)].sort((a, b) => a - b);
    if (!queue.length) return;
    setReviewField(field);
    setReviewQueue(queue);
    setEditing(null);
  }

  function selectFiltered() {
    setSelected(new Set(filtered.map((f) => f.index)));
  }

  function selectNeedingPrice() {
    const indices = items
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !p.hidden && p.price == null)
      .map(({ i }) => i);
    setSelected(new Set(indices));
    setFilter("no_price");
    setTab("products");
  }

  async function saveDefaults() {
    const next: CatalogDefaults = {
      category: draftCategory.trim(),
      currency: draftCurrency.trim() || null,
    };
    const result = await api({
      action: "setDefaults",
      defaults: next,
    });
    if (result) {
      setDefaults(next);
      setShowDefaults(false);
      setToast(isFa ? "قالب ذخیره شد" : "Defaults saved");
    }
  }

  async function applyDefaultsToSelected() {
    const indices = [...selected];
    if (!indices.length) return;
    const patches = indices.map((index) => {
      const p = items[index]!;
      return {
        index,
        product: {
          category: p.category?.trim() ? p.category : defaults.category,
          currency: p.currency || defaults.currency,
        },
      };
    });
    const ok = await commitPatches(patches);
    if (ok) {
      setSelected(new Set());
      setToast(isFa ? "قالب اعمال شد" : "Defaults applied");
    }
  }

  async function mergeDuplicates(keepIndex: number, mergeIndices: number[]) {
    const keepProduct = items[keepIndex];
    if (!keepProduct || !mergeIndices.length) return;
    const result = await api({
      action: "merge",
      keepIndex,
      mergeIndices,
      keepId: keepProduct.id,
      mergeIds: mergeIndices
        .map((i) => items[i]?.id)
        .filter((id): id is string => Boolean(id)),
    });
    if (result) {
      setItems((prev) => {
        const next = [...prev];
        const others = mergeIndices.map((i) => next[i]!).filter(Boolean);
        if (!next[keepIndex]) return prev;
        next[keepIndex] = mergeProductData(next[keepIndex]!, others);
        for (const i of [...mergeIndices].sort((a, b) => b - a)) {
          next.splice(i, 1);
        }
        return next;
      });
      setEditing(null);
      setSelected(new Set());
      setToast(isFa ? "ادغام شد" : "Merged");
    }
  }

  async function suggestPricesForSelection(indices: number[]) {
    const targets = indices.filter((i) => items[i] && items[i]!.price == null);
    if (!targets.length) {
      setToast(isFa ? "همه قیمت دارند" : "All already priced");
      return;
    }

    // Instant caption pass
    const localPatches: Array<{
      index: number;
      product: Partial<StudioProduct>;
    }> = [];
    const stillNeed: number[] = [];
    for (const index of targets) {
      const p = items[index]!;
      const hint = extractPriceFromText(
        `${p.name}\n${p.description ?? ""}`,
        locale,
      );
      if (hint) {
        localPatches.push({
          index,
          product: {
            price: hint.price,
            currency: p.currency || hint.currency || defaults.currency,
          },
        });
      } else {
        stillNeed.push(index);
      }
    }

    let aiPatches: Array<{ index: number; product: Partial<StudioProduct> }> =
      [];
    if (stillNeed.length) {
      setPending(true);
      const response = await fetch(
        `/api/websites/${websiteId}/products/suggest-prices`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ indices: stillNeed }),
        },
      );
      setPending(false);
      if (response.ok) {
        const payload = (await response.json()) as {
          suggestions?: Array<{
            index: number;
            price: number;
            currency: string | null;
          }>;
        };
        aiPatches = (payload.suggestions ?? []).map((s) => ({
          index: s.index,
          product: {
            price: s.price,
            currency:
              items[s.index]?.currency || s.currency || defaults.currency,
          },
        }));
      }
    }

    const all = [...localPatches, ...aiPatches];
    if (!all.length) {
      setToast(isFa ? "قیمتی در کپشن‌ها نبود" : "No prices found in captions");
      return;
    }
    const ok = await commitPatches(all);
    if (ok) {
      setSelected(new Set());
      setToast(
        isFa
          ? `${all.length} قیمت پیشنهاد و ذخیره شد`
          : `${all.length} prices suggested & saved`,
      );
    }
  }

  async function suggestOnePrice(index: number) {
    const response = await fetch(
      `/api/websites/${websiteId}/products/suggest-prices`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ indices: [index] }),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      suggestions?: Array<{
        index: number;
        price: number;
        currency: string | null;
      }>;
    };
    const row = payload.suggestions?.[0];
    if (!row) return null;
    return { price: row.price, currency: row.currency };
  }

  function handleUploadedMedia(
    uploaded: UploadedMediaItem[],
    productIndex?: number | null,
  ) {
    setMedia((prev) => {
      const next = { ...prev };
      for (const item of uploaded) {
        next[item.id] = { url: item.url, type: item.type };
      }
      return next;
    });
    setLibraryExtra((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const add = uploaded
        .filter((u) => !ids.has(u.id))
        .map((u) => ({ id: u.id, url: u.url, type: u.type }));
      return [...add, ...prev];
    });
    if (productIndex != null && items[productIndex]) {
      setItems((prev) =>
        prev.map((p, i) =>
          i === productIndex
            ? {
                ...p,
                imageIds: [
                  ...uploaded.map((u) => u.id),
                  ...p.imageIds,
                ]
                  .filter((id, idx, arr) => arr.indexOf(id) === idx)
                  .slice(0, 12),
              }
            : p,
        ),
      );
    }
    if (productIndex == null) setTab("media");
    setToast(
      isFa
        ? `${uploaded.length} فایل آپلود شد`
        : `${uploaded.length} file(s) uploaded`,
    );
    scheduleRefresh();
  }

  const library = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...libraryExtra, ...mediaLibrary];
    return merged.filter((item) => {
      if (seen.has(item.id) || seen.has(item.url)) return false;
      seen.add(item.id);
      seen.add(item.url);
      return true;
    });
  }, [libraryExtra, mediaLibrary]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (editing != null && items[editing]) {
          void saveProduct(editing, items[editing]!);
        }
        return;
      }
      if (!typing && !reviewQueue && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        void createProduct();
      }
      if (e.key === "Escape" && !reviewQueue) setEditing(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, items, reviewQueue]);

  const editingProduct = editing != null ? items[editing] : null;
  const issues = health.noPrice + health.noImage;

  return (
    <div className="relative space-y-6">
      {/* Hero */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {isFa ? "استودیوی کاتالوگ" : "Catalog studio"}
          </p>
          <h1 className="mt-1.5 font-display text-[2rem] leading-none tracking-tight text-ink md:text-[2.35rem]">
            {brandName}
          </h1>
          <div className="mt-4 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {health.ready}/{health.visible || 0}{" "}
                {isFa ? "آماده فروش" : "ready to sell"}
              </span>
              <span className="tabular-nums">{readyRatio}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500"
                style={{ width: `${readyRatio}%` }}
              />
            </div>
            {issues > 0 ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="text-[12px] text-amber-800 underline-offset-2 hover:underline"
                  onClick={() => {
                    setFilter(health.noImage > 0 ? "no_image" : "no_price");
                    setTab("products");
                  }}
                >
                  {isFa
                    ? `${issues} مورد نیاز به تکمیل`
                    : `${issues} need attention`}
                </button>
                {health.noPrice > 0 ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-[11px]"
                      onClick={() => {
                        const indices = items
                          .map((p, i) => ({ p, i }))
                          .filter(({ p }) => !p.hidden && p.price == null)
                          .map(({ i }) => i);
                        startReview(indices, "price");
                      }}
                    >
                      <Wand2 className="size-3" aria-hidden />
                      {isFa ? "پر کردن قیمت‌ها" : "Fill prices"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-[11px]"
                      disabled={pending}
                      onClick={() => {
                        const indices = items
                          .map((p, i) => ({ p, i }))
                          .filter(({ p }) => !p.hidden && p.price == null)
                          .map(({ i }) => i);
                        void suggestPricesForSelection(indices);
                      }}
                    >
                      <Sparkles className="size-3" aria-hidden />
                      {isFa ? "پیشنهاد از کپشن" : "Suggest from captions"}
                    </Button>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="mt-2.5 text-[12px] text-muted-foreground">
                {isFa
                  ? "کاتالوگ آماده انتشار است."
                  : "Catalog looks publish-ready."}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void createProduct()}
            disabled={pending}
          >
            <Plus className="size-3.5" aria-hidden />
            {isFa ? "محصول جدید" : "New product"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={previewBase} target="_blank">
              {isFa ? "پیش‌نمایش" : "Preview"}
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraftCategory(defaults.category);
              setDraftCurrency(defaults.currency ?? "");
              setShowDefaults((v) => !v);
            }}
          >
            <Settings2 className="size-3.5" aria-hidden />
            {isFa ? "قالب" : "Defaults"}
          </Button>
        </div>
      </header>

      {showDefaults ? (
        <div className="rounded-[1.35rem] border border-border bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {isFa ? "قالب پیش‌فرض فروشگاه" : "Store catalog defaults"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFa
              ? "محصول جدید و پست→محصول این مقادیر را می‌گیرند."
              : "New products and post→product use these values."}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-[11px] text-muted-foreground">
              {isFa ? "دسته پیش‌فرض" : "Default category"}
              <Input
                className="mt-1 h-9 w-44"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                placeholder={isFa ? "مثلاً پوشاک" : "e.g. Apparel"}
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              {isFa ? "واحد پیش‌فرض" : "Default currency"}
              <Input
                className="mt-1 h-9 w-28"
                value={draftCurrency}
                onChange={(e) => setDraftCurrency(e.target.value)}
                placeholder="IRT"
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => void saveDefaults()}
            >
              {isFa ? "ذخیره قالب" : "Save defaults"}
            </Button>
            {selected.size > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => void applyDefaultsToSelected()}
              >
                {isFa ? "اعمال به انتخاب‌شده‌ها" : "Apply to selected"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="sticky top-14 z-20 -mx-1 space-y-3 bg-[#f4f4f2]/90 px-1 py-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-0.5 rounded-full bg-white p-1 ring-1 ring-border/80">
            {(
              [
                ["products", isFa ? "محصولات" : "Products", health.visible],
                ["instagram", isFa ? "اینستا" : "Instagram", posts.length],
                ["media", isFa ? "مدیا" : "Media", library.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  tab === id
                    ? "bg-ink text-white"
                    : "text-muted-foreground hover:text-ink",
                )}
              >
                {label}
                <span
                  className={cn(
                    "tabular-nums text-[10px]",
                    tab === id ? "text-white/60" : "text-muted-foreground/70",
                  )}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {tab === "products" ? (
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 border-border/80 bg-white ps-9 shadow-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isFa ? "جستجو…" : "Search…"}
              />
            </div>
          ) : null}
        </div>

        {tab === "products" ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-1.5">
              {(
                [
                  ["all", isFa ? "همه" : "All"],
                  ["ready", isFa ? "آماده" : "Ready"],
                  ["no_price", isFa ? "بدون قیمت" : "No price"],
                  ["no_image", isFa ? "بدون عکس" : "No image"],
                  ["hidden", isFa ? "مخفی" : "Hidden"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                    filter === id
                      ? "bg-ink/90 text-white"
                      : "bg-white/80 text-muted-foreground ring-1 ring-border/70 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="mx-1 h-4 w-px shrink-0 bg-border" />
            <button
              type="button"
              className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-ink"
              onClick={selectFiltered}
            >
              {isFa ? "انتخاب فیلتر" : "Select filtered"}
            </button>
            {health.noPrice > 0 ? (
              <button
                type="button"
                className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-ink"
                onClick={selectNeedingPrice}
              >
                {isFa ? "بدون‌قیمت‌ها" : "No-price"}
              </button>
            ) : null}
          </div>
        ) : null}

        {selected.size > 0 ? (
          <div className="space-y-2.5 rounded-2xl border border-border bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink">
                {selected.size} {isFa ? "انتخاب‌شده" : "selected"}
              </span>
              <div className="ms-auto flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => startReview([...selected], "price")}
                >
                  <Wand2 className="size-3.5" aria-hidden />
                  {isFa ? "ویرایش سریع" : "Quick edit"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void suggestPricesForSelection([...selected])}
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  {isFa ? "پیشنهاد قیمت" : "Suggest prices"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void applyDefaultsToSelected()}
                >
                  <Copy className="size-3.5" aria-hidden />
                  {isFa ? "اعمال قالب" : "Apply defaults"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulkTool === "price" ? "soft" : "ghost"}
                  onClick={() =>
                    setBulkTool((t) => (t === "price" ? null : "price"))
                  }
                >
                  {isFa ? "قیمت گروهی" : "Bulk price"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulkTool === "category" ? "soft" : "ghost"}
                  onClick={() =>
                    setBulkTool((t) => (t === "category" ? null : "category"))
                  }
                >
                  {isFa ? "دسته" : "Category"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulkTool === "currency" ? "soft" : "ghost"}
                  onClick={() =>
                    setBulkTool((t) => (t === "currency" ? null : "currency"))
                  }
                >
                  {isFa ? "واحد" : "Currency"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void bulk({ hidden: true })}
                >
                  <EyeOff className="size-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void bulk({ hidden: false })}
                >
                  <Eye className="size-3.5" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void bulk({ delete: true })}
                >
                  {isFa ? "حذف" : "Delete"}
                </Button>
                <button
                  type="button"
                  className="px-2 text-xs text-muted-foreground hover:text-ink"
                  onClick={() => {
                    setSelected(new Set());
                    setBulkTool(null);
                  }}
                >
                  {isFa ? "لغو" : "Clear"}
                </button>
              </div>
            </div>

            {bulkTool === "category" ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
                <Input
                  className="h-8 max-w-[200px]"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  placeholder={isFa ? "نام دسته…" : "Category name…"}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!bulkCategory.trim() || pending}
                  onClick={() => void bulk({ category: bulkCategory.trim() })}
                >
                  {isFa ? "اعمال به همه" : "Apply to all"}
                </Button>
              </div>
            ) : null}

            {bulkTool === "currency" ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
                {(isFa ? ["IRT", "USD", "EUR"] : ["USD", "EUR", "IRT"]).map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      className="rounded-full bg-[#f4f4f2] px-3 py-1 text-[11px] font-medium hover:bg-ink hover:text-white"
                      onClick={() => {
                        setBulkCurrency(c);
                        void bulk({ currency: c });
                      }}
                    >
                      {c}
                    </button>
                  ),
                )}
                <Input
                  className="h-8 w-24"
                  value={bulkCurrency}
                  onChange={(e) => setBulkCurrency(e.target.value)}
                  placeholder={isFa ? "سفارشی" : "Custom"}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!bulkCurrency.trim() || pending}
                  onClick={() => void bulk({ currency: bulkCurrency.trim() })}
                >
                  {isFa ? "اعمال" : "Apply"}
                </Button>
              </div>
            ) : null}

            {bulkTool === "price" ? (
              <div className="flex flex-wrap items-end gap-3 border-t border-border/70 pt-2.5">
                <label className="text-[11px] text-muted-foreground">
                  {isFa ? "قیمت یکسان" : "Same price"}
                  <Input
                    className="mt-1 h-8 w-32"
                    type="number"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={bulkPrice === "" || pending}
                  onClick={() =>
                    void bulk({
                      price:
                        bulkPrice.trim() === ""
                          ? null
                          : Number(bulkPrice),
                    })
                  }
                >
                  {isFa ? "اعمال" : "Set"}
                </Button>
                <span className="hidden h-6 w-px bg-border sm:block" />
                <label className="text-[11px] text-muted-foreground">
                  {isFa ? "درصد تغییر" : "% change"}
                  <div className="mt-1 flex gap-1.5">
                    <Input
                      className="h-8 w-20"
                      type="number"
                      value={pricePercent}
                      onChange={(e) => setPricePercent(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        void applyPricePercent(Number(pricePercent) || 0)
                      }
                    >
                      <Percent className="size-3.5" aria-hidden />
                      {isFa ? "اعمال" : "Apply"}
                    </Button>
                  </div>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void roundSelectedPrices()}
                >
                  {isFa ? "گرد کردن" : "Round"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => startReview([...selected], "price")}
                >
                  {isFa ? "دونه‌دونه" : "One by one"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {tab === "products" ? (
        filtered.length === 0 ? (
          <EmptyCatalog
            isFa={isFa}
            onCreate={() => void createProduct()}
            onInstagram={() => setTab("instagram")}
          />
        ) : (
          <div className="space-y-5">
            {duplicateGroups.length > 0 && showDupes ? (
              <DuplicatesPanel
                groups={duplicateGroups}
                items={items}
                media={media}
                locale={locale}
                pending={pending}
                onMerge={(keep, rest) => void mergeDuplicates(keep, rest)}
                onSelectGroup={(indices) => setSelected(new Set(indices))}
                onDismiss={() => setShowDupes(false)}
              />
            ) : duplicateGroups.length > 0 ? (
              <button
                type="button"
                className="text-[12px] text-amber-800 underline-offset-2 hover:underline"
                onClick={() => setShowDupes(true)}
              >
                {isFa
                  ? `${duplicateGroups.length} گروه تکراری پنهان`
                  : `${duplicateGroups.length} duplicate groups hidden`}
              </button>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filtered.map(({ product, index }) => (
                <ProductCard
                  key={product.id ?? `${product.name}-${index}`}
                  product={product}
                  index={index}
                  locale={locale}
                  img={mediaUrl(media, product.imageIds?.[0])}
                  selected={selected.has(index)}
                  onSelect={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })
                  }
                  onOpen={() => setEditing(index)}
                  onDragStart={() => setDragFrom(index)}
                  onDrop={() => {
                    if (dragFrom != null) void reorder(dragFrom, index);
                    setDragFrom(null);
                  }}
                />
              ))}
            </div>
          </div>
        )
      ) : null}

      {tab === "instagram" ? (
        <InstagramTab
          posts={posts}
          locale={locale}
          products={items}
          onCreate={(post) => void fromPost(post)}
          onAttach={(post, index) => void attachToProduct(post, index)}
          pending={pending}
        />
      ) : null}

      {tab === "media" ? (
        <MediaTab
          websiteId={websiteId}
          media={library}
          products={items}
          locale={locale}
          onAttach={async (mediaId, productIndex) => {
            const result = await api({
              action: "attachMedia",
              index: productIndex,
              imageId: mediaId,
              append: true,
            });
            if (result) {
              setItems((prev) =>
                prev.map((p, i) =>
                  i === productIndex
                    ? {
                        ...p,
                        imageIds: p.imageIds.includes(mediaId)
                          ? p.imageIds
                          : [...p.imageIds, mediaId].slice(0, 12),
                      }
                    : p,
                ),
              );
              setEditing(productIndex);
              setTab("products");
              setToast(isFa ? "عکس وصل شد" : "Image attached");
            }
          }}
          onUploaded={(items) => handleUploadedMedia(items)}
        />
      ) : null}

      {editingProduct && editing != null ? (
        <ProductDrawer
          product={editingProduct}
          index={editing}
          locale={locale}
          media={media}
          mediaLibrary={library}
          pending={pending}
          websiteId={websiteId}
          onClose={() => setEditing(null)}
          onChange={(patch) =>
            setItems((prev) =>
              prev.map((p, i) => (i === editing ? { ...p, ...patch } : p)),
            )
          }
          onSave={() => void saveProduct(editing, items[editing]!)}
          onToggleHidden={() => {
            const next = {
              ...editingProduct,
              hidden: !editingProduct.hidden,
            };
            setItems((prev) =>
              prev.map((p, i) => (i === editing ? next : p)),
            );
            void saveProduct(editing, next);
          }}
          onSuggest={() => {
            const cat = suggestCategory(
              editingProduct.name,
              editingProduct.description,
            );
            if (cat) {
              setItems((prev) =>
                prev.map((p, i) =>
                  i === editing ? { ...p, category: cat } : p,
                ),
              );
            }
          }}
          onSetPrimaryImage={(imageId) => {
            const nextIds = [
              imageId,
              ...editingProduct.imageIds.filter((x) => x !== imageId),
            ].slice(0, 12);
            setItems((prev) =>
              prev.map((p, i) =>
                i === editing ? { ...p, imageIds: nextIds } : p,
              ),
            );
          }}
          onUploaded={(uploaded) => handleUploadedMedia(uploaded, editing)}
        />
      ) : null}

      {reviewQueue ? (
        <BulkFocusReview
          queue={reviewQueue}
          items={items}
          media={media}
          locale={locale}
          field={reviewField}
          pending={pending}
          onFieldChange={setReviewField}
          onClose={() => {
            setReviewQueue(null);
            setSelected(new Set());
          }}
          onCommit={commitPatches}
          onSuggestFromAi={suggestOnePrice}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
          <p className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
            {toast}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ProductCard({
  product,
  index,
  locale,
  img,
  selected,
  onSelect,
  onOpen,
  onDragStart,
  onDrop,
}: {
  product: StudioProduct;
  index: number;
  locale: "fa" | "en";
  img: string | null;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const isFa = locale === "fa";
  const h = productHealth(product);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDrop={onDrop}
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] bg-white transition-[transform,box-shadow]",
        "ring-1 ring-border/80 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]",
        selected && "ring-2 ring-ink",
      )}
    >
      <button type="button" className="block w-full text-start" onClick={onOpen}>
        <div className="relative aspect-[4/5] overflow-hidden bg-[#ecece9]">
          {img ? (
            <SiteImage
              src={img}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width:768px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[linear-gradient(165deg,#f6f6f4,#e9e9e6)]">
              <ImagePlus className="size-5 text-muted-foreground/70" />
              <p className="text-[11px] text-muted-foreground">
                {isFa ? "افزودن عکس" : "Add image"}
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent p-3.5 pt-12">
            <HealthChip health={h} locale={locale} />
          </div>
        </div>
        <div className="space-y-1 px-4 py-3.5">
          <p className="truncate text-[15px] font-semibold tracking-tight text-ink">
            {product.name || (isFa ? "بدون نام" : "Untitled")}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[12px] text-muted-foreground">
              {product.category || (isFa ? "بدون دسته" : "Uncategorized")}
            </p>
            <p className="shrink-0 text-[13px] font-medium tabular-nums text-ink">
              {product.price != null
                ? product.price.toLocaleString(
                    locale === "fa" ? "fa-IR" : "en-US",
                  )
                : "—"}
            </p>
          </div>
        </div>
      </button>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-lg backdrop-blur-md transition-colors",
            selected
              ? "bg-ink text-white"
              : "bg-white/90 text-muted-foreground hover:text-ink",
          )}
          aria-label={isFa ? "انتخاب" : "Select"}
        >
          {selected ? (
            <Check className="size-3.5" />
          ) : (
            <span className="size-3 rounded-[3px] border border-current/40" />
          )}
        </button>
        <span className="inline-flex size-7 cursor-grab items-center justify-center rounded-lg bg-white/90 text-muted-foreground backdrop-blur-md active:cursor-grabbing">
          <GripVertical className="size-3.5" aria-hidden />
        </span>
      </div>
      <span className="sr-only">
        {isFa ? `محصول ${index + 1}` : `Product ${index + 1}`}
      </span>
    </article>
  );
}

function HealthChip({
  health,
  locale,
}: {
  health: ProductHealth;
  locale: "fa" | "en";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium backdrop-blur-md",
        health === "ready"
          ? "bg-emerald-500/90 text-white"
          : health === "hidden"
            ? "bg-white/85 text-muted-foreground"
            : "bg-white/90 text-amber-900",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          health === "ready"
            ? "bg-white"
            : health === "hidden"
              ? "bg-muted-foreground/50"
              : "bg-amber-500",
        )}
      />
      {healthLabel(health, locale)}
    </span>
  );
}

function EmptyCatalog({
  isFa,
  onCreate,
  onInstagram,
}: {
  isFa: boolean;
  onCreate: () => void;
  onInstagram: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-white/60 px-6 py-20 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#f6f6f4] ring-1 ring-border/60">
        <Package className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-4 font-display text-xl text-ink">
        {isFa ? "قفسه خالی است" : "Empty shelf"}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {isFa
          ? "از پست اینستاگرام بساز یا یک محصول خالی اضافه کن."
          : "Create from an Instagram post or add a blank product."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button type="button" size="sm" onClick={onCreate}>
          {isFa ? "محصول جدید" : "New product"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onInstagram}>
          {isFa ? "از اینستاگرام" : "From Instagram"}
        </Button>
      </div>
    </div>
  );
}

function InstagramTab({
  posts,
  locale,
  products,
  onCreate,
  onAttach,
  pending,
}: {
  posts: PostCard[];
  locale: "fa" | "en";
  products: StudioProduct[];
  onCreate: (post: PostCard) => void;
  onAttach: (post: PostCard, productIndex: number) => void;
  pending: boolean;
}) {
  const isFa = locale === "fa";
  if (!posts.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border/80 px-6 py-16 text-center text-sm text-muted-foreground">
        {isFa ? "پستی وارد نشده." : "No imported posts yet."}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {posts.map((post) => {
        const src = post.displayUrl || post.images[0];
        return (
          <article
            key={post.id}
            className="group overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-border/80"
          >
            <div className="relative aspect-square bg-[#ecece9]">
              {src ? (
                <SiteImage
                  src={src}
                  alt={post.alt ?? ""}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="25vw"
                />
              ) : null}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex w-full flex-wrap gap-2 p-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-white text-ink hover:bg-white/90"
                    disabled={pending}
                    onClick={() => onCreate(post)}
                  >
                    <Sparkles className="size-3.5" aria-hidden />
                    {isFa ? "محصول بساز" : "Make product"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2.5 p-3.5">
              <p className="text-[11px] text-muted-foreground">
                @{post.username}
                <span className="mx-1.5 text-border">·</span>
                {post.type}
              </p>
              <p className="line-clamp-2 text-[12px] leading-5 text-ink/90">
                {post.caption || "—"}
              </p>
              {products.length ? (
                <select
                  className="h-8 w-full rounded-xl border-0 bg-[#f6f6f4] px-2.5 text-[11px] outline-none ring-1 ring-border/60"
                  defaultValue=""
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (Number.isFinite(idx)) onAttach(post, idx);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    {isFa ? "چسباندن به محصول…" : "Attach to product…"}
                  </option>
                  {products.map((p, i) => (
                    <option key={p.id ?? i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MediaTab({
  websiteId,
  media,
  products,
  locale,
  onAttach,
  onUploaded,
}: {
  websiteId: string;
  media: MediaCard[];
  products: StudioProduct[];
  locale: "fa" | "en";
  onAttach: (mediaId: string, productIndex: number) => void;
  onUploaded: (items: UploadedMediaItem[]) => void;
}) {
  const isFa = locale === "fa";
  return (
    <div className="space-y-5">
      <MediaUploadZone
        websiteId={websiteId}
        locale={locale}
        onUploaded={onUploaded}
      />

      {!media.length ? (
        <div className="rounded-[1.5rem] border border-dashed border-border/80 px-6 py-12 text-center text-sm text-muted-foreground">
          {isFa
            ? "هنوز مدیایی نیست — از بالا آپلود کن یا از اینستاگرام وارد کن."
            : "No media yet — upload above or import from Instagram."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {media.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl bg-white ring-1 ring-border/80"
            >
              <div className="relative aspect-square bg-[#ecece9]">
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    className="absolute inset-0 size-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <SiteImage
                    src={item.url}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    sizes="16vw"
                  />
                )}
                {item.type === "video" ? (
                  <span className="absolute start-2 top-2 rounded-full bg-ink/75 px-2 py-0.5 text-[9px] font-medium text-white">
                    Video
                  </span>
                ) : null}
              </div>
              <div className="p-2">
                <select
                  className="h-8 w-full rounded-lg border-0 bg-[#f6f6f4] px-2 text-[10px] outline-none"
                  defaultValue=""
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (Number.isFinite(idx)) onAttach(item.id, idx);
                    e.target.value = "";
                  }}
                >
                  <option value="" disabled>
                    {isFa ? "وصل به…" : "Attach…"}
                  </option>
                  {products.map((p, i) => (
                    <option key={p.id ?? i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductDrawer({
  product,
  index,
  locale,
  media,
  mediaLibrary,
  pending,
  websiteId,
  onClose,
  onChange,
  onSave,
  onToggleHidden,
  onSuggest,
  onSetPrimaryImage,
  onUploaded,
}: {
  product: StudioProduct;
  index: number;
  locale: "fa" | "en";
  media: Record<string, { url: string; type?: string }>;
  mediaLibrary: MediaCard[];
  pending: boolean;
  websiteId: string;
  onClose: () => void;
  onChange: (patch: Partial<StudioProduct>) => void;
  onSave: () => void;
  onToggleHidden: () => void;
  onSuggest: () => void;
  onSetPrimaryImage: (imageId: string) => void;
  onUploaded: (items: UploadedMediaItem[]) => void;
}) {
  const isFa = locale === "fa";
  const img = mediaUrl(media, product.imageIds?.[0]);
  const h = productHealth(product);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        aria-label={isFa ? "بستن" : "Close"}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-[26rem] animate-in flex-col border-s border-border bg-white shadow-[0_0_80px_rgba(0,0,0,0.2)] slide-in-from-right duration-300">
        <div className="relative h-52 shrink-0 overflow-hidden bg-[#ecece9] sm:h-60">
          {img ? (
            <SiteImage
              src={img}
              alt=""
              fill
              className="object-cover"
              sizes="420px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              {isFa ? "بدون تصویر" : "No image"}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <div className="min-w-0">
              <HealthChip health={h} locale={locale} />
              <p className="mt-2 truncate font-display text-xl text-white">
                {product.name || (isFa ? "بدون نام" : "Untitled")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-ink backdrop-blur"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="text-[12px] leading-5 text-muted-foreground">
            {isFa
              ? "پیش‌نمایش کارت فروشگاه — نام و قیمت را کامل کن."
              : "Store card preview — finish name and price."}
          </p>

          <Field label={isFa ? "نام" : "Name"}>
            <Input
              value={product.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={isFa ? "قیمت" : "Price"}>
              <Input
                type="number"
                value={product.price ?? ""}
                onChange={(e) =>
                  onChange({
                    price:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label={isFa ? "واحد" : "Currency"}>
              <Input
                value={product.currency ?? ""}
                onChange={(e) =>
                  onChange({ currency: e.target.value || null })
                }
              />
            </Field>
          </div>

          <Field
            label={isFa ? "دسته" : "Category"}
            action={
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] text-ink hover:underline"
                onClick={onSuggest}
              >
                <Sparkles className="size-3" aria-hidden />
                {isFa ? "پیشنهاد" : "Suggest"}
              </button>
            }
          >
            <Input
              value={product.category ?? ""}
              onChange={(e) => onChange({ category: e.target.value })}
            />
          </Field>

          <Field label={isFa ? "توضیح" : "Description"}>
            <textarea
              className="min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
              value={product.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                {isFa ? "تصاویر" : "Images"}
              </p>
              <MediaUploadZone
                websiteId={websiteId}
                locale={locale}
                productIndex={index}
                compact
                disabled={pending}
                onUploaded={onUploaded}
              />
            </div>
            {mediaLibrary.length ? (
              <div className="grid grid-cols-4 gap-2">
                {mediaLibrary.slice(0, 16).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-xl ring-1 ring-border/70 transition-shadow",
                      product.imageIds[0] === m.id &&
                        "ring-2 ring-ink shadow-[0_0_0_2px_rgba(0,0,0,0.06)]",
                    )}
                    onClick={() => onSetPrimaryImage(m.id)}
                  >
                    {m.type === "video" ? (
                      <video
                        src={m.url}
                        className="absolute inset-0 size-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <SiteImage
                        src={m.url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                {isFa
                  ? "هنوز عکسی نیست — آپلود کن."
                  : "No images yet — upload one."}
              </p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isFa ? `محصول ${index + 1}` : `Product ${index + 1}`} · Esc{" "}
            {isFa ? "بستن" : "close"}
          </p>
        </div>

        <div className="flex gap-2 border-t border-border bg-[#fafafa] p-4">
          <Button
            type="button"
            className="flex-1"
            disabled={pending || !product.name.trim()}
            onClick={onSave}
          >
            {pending ? "…" : isFa ? "ذخیره" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onToggleHidden}>
            {product.hidden ? (
              <Eye className="size-3.5" aria-hidden />
            ) : (
              <EyeOff className="size-3.5" aria-hidden />
            )}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block text-[11px] font-medium text-muted-foreground">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        {label}
        {action}
      </span>
      {children}
    </label>
  );
}
