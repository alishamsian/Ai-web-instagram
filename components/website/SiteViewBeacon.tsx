"use client";

import { useEffect } from "react";

/** Fire-and-forget pageview for published storefronts. */
export function SiteViewBeacon({
  websiteId,
  slug,
  path = "/",
}: {
  websiteId: string;
  slug: string;
  path?: string;
}) {
  useEffect(() => {
    const payload = {
      websiteId,
      slug,
      path,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    };
    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, [websiteId, slug, path]);

  return null;
}
