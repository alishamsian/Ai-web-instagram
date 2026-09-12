"use client";

import { useEffect } from "react";

/** Opens a <details id> when hash or ?section= matches. */
export function HashDetailsOpener({ id }: { id: string }) {
  useEffect(() => {
    const openIfMatched = () => {
      const hashMatch = window.location.hash === `#${id}`;
      const params = new URLSearchParams(window.location.search);
      const queryMatch = params.get("section") === id;
      if (!hashMatch && !queryMatch) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    openIfMatched();
    // Delay once for hydration / layout
    const t = window.setTimeout(openIfMatched, 50);
    window.addEventListener("hashchange", openIfMatched);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", openIfMatched);
    };
  }, [id]);
  return null;
}
