"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoreCatalogProduct } from "@/lib/store/theme";

export type CartLine = {
  key: string;
  product: StoreCatalogProduct;
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  add: (product: StoreCatalogProduct, qty?: number) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStored(key: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function StoreCartProvider({
  children,
  storageKey = "vitrin-store-cart",
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStored(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      /* ignore quota */
    }
  }, [lines, storageKey, hydrated]);

  const add = useCallback((product: StoreCatalogProduct, qty = 1) => {
    setLines((prev) => {
      const key = product.id;
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, qty: line.qty + qty } : line,
        );
      }
      return [...prev, { key, product, qty }];
    });
    setOpen(true);
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      prev
        .map((line) =>
          line.key === key ? { ...line, qty: Math.max(0, qty) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      open,
      setOpen,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      add,
      remove,
      setQty,
      clear,
    }),
    [lines, open, add, remove, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useStoreCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useStoreCart must be used within StoreCartProvider");
  }
  return ctx;
}
