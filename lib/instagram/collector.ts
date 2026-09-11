import type { InstagramCollector } from "@/types/instagram";
import { isApifyConfigured } from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import { ApifyCollector } from "@/lib/instagram/apify";
import { MockInstagramCollector } from "@/lib/instagram/mock";
import { isDemoUsername } from "@/lib/instagram/url";

export function getInstagramCollector(username?: string): InstagramCollector {
  if (username && isDemoUsername(username)) {
    return new MockInstagramCollector();
  }
  if (isApifyConfigured()) {
    return new ApifyCollector();
  }
  if (!allowMockServices()) {
    throw new Error(
      "APIFY_API_TOKEN is required in production. Set ALLOW_MOCK=true to override.",
    );
  }
  return new MockInstagramCollector();
}

export { MockInstagramCollector } from "./mock";
export { ApifyCollector } from "./apify";
