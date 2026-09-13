import type { Product } from "@/types/ai";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import type { FilterDefinition } from "@/lib/store/verticals/types";
import {
  getFiltersForVertical,
  getProductAttributesForVertical,
  resolveVerticalPack,
} from "@/lib/store/verticals/resolve";

export type ProductAttributeMap = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

/** Read industry attributes without requiring a second Product model. */
export function getProductAttributeMap(
  product: Product | StoreCatalogProduct,
): ProductAttributeMap {
  return product.industryData?.attributes ?? {};
}

export function getProductAttributeValue(
  product: Product | StoreCatalogProduct,
  key: string,
): string | number | boolean | string[] | null | undefined {
  return getProductAttributeMap(product)[key];
}

function normalizeToken(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value === "boolean") return [value ? "true" : "false"];
  const text = String(value).trim().toLowerCase();
  return text ? [text] : [];
}

export function productMatchesAttribute(
  product: Product | StoreCatalogProduct,
  attribute: string,
  selected?: string | string[] | null,
): boolean {
  if (selected == null || selected === "" || (Array.isArray(selected) && !selected.length)) {
    return true;
  }
  const wanted = new Set(normalizeToken(selected));
  const have = normalizeToken(getProductAttributeValue(product, attribute));
  if (have.length === 0) return false;
  return have.some((token) => wanted.has(token));
}

export function filterProductsByAttribute<T extends Product | StoreCatalogProduct>(
  products: T[],
  attribute: string,
  selected?: string | string[] | null,
): T[] {
  if (!attribute) return products;
  if (selected == null || selected === "" || (Array.isArray(selected) && !selected.length)) {
    // No active filter: keep products that define the attribute first, else all
    const withAttr = products.filter(
      (p) => normalizeToken(getProductAttributeValue(p, attribute)).length > 0,
    );
    return withAttr.length ? withAttr : products;
  }
  return products.filter((p) => productMatchesAttribute(p, attribute, selected));
}

export function filterProductsByFilters<T extends Product | StoreCatalogProduct>(
  products: T[],
  active: Record<string, string | string[] | null | undefined>,
): T[] {
  return products.filter((product) =>
    Object.entries(active).every(([attribute, selected]) =>
      productMatchesAttribute(product, attribute, selected),
    ),
  );
}

export function collectAttributeOptions(
  products: Array<Product | StoreCatalogProduct>,
  attribute: string,
): string[] {
  const values = new Set<string>();
  for (const product of products) {
    for (const token of normalizeToken(getProductAttributeValue(product, attribute))) {
      values.add(token);
    }
  }
  return [...values].sort();
}

/**
 * Declarative filters from VerticalPack → usable filter descriptors + option values.
 */
export function resolveVerticalFilters(
  verticalId: string | null | undefined,
  products: Array<Product | StoreCatalogProduct> = [],
): Array<
  FilterDefinition & {
    options: string[];
    attributeKeys: string[];
  }
> {
  const pack = resolveVerticalPack(verticalId);
  const defs = getFiltersForVertical(pack.id);
  const attrs = getProductAttributesForVertical(pack.id);

  return defs.map((filter) => {
    const attrDef = attrs.find((a) => a.key === filter.attribute);
    const fromProducts = collectAttributeOptions(products, filter.attribute);
    const fromSchema =
      attrDef?.options?.map((o) => o.value) ??
      [];
    const options = fromProducts.length ? fromProducts : fromSchema;
    return {
      ...filter,
      options,
      attributeKeys: [filter.attribute],
    };
  });
}
