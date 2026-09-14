import type { InstagramCollector } from "@/types/instagram";
import { isApifyConfigured } from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import { ApifyCollector } from "@/lib/instagram/apify";
import { MockInstagramCollector } from "@/lib/instagram/mock";
import { isDemoUsername } from "@/lib/instagram/url";

/**
 * Resolve the Instagram collector.
 * Demo usernames always use Mock. Real profiles require Apify in production —
 * never silently substitute Mock for a production import (even with ALLOW_MOCK).
 */
export function getInstagramCollector(username?: string): InstagramCollector {
  if (username && isDemoUsername(username)) {
    return new MockInstagramCollector();
  }
  if (isApifyConfigured()) {
    return new ApifyCollector();
  }
  // Dev-only convenience: missing Apify → mock. Production always fails closed.
  if (allowMockServices() && process.env.NODE_ENV !== "production") {
    return new MockInstagramCollector();
  }
  throw new Error(
    "APIFY_API_TOKEN is required for Instagram imports. Demo usernames work without Apify.",
  );
}

export { MockInstagramCollector } from "./mock";
export { ApifyCollector } from "./apify";
