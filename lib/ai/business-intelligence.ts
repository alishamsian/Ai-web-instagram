import type { BusinessProfile } from "@/lib/business/types";
import type { BusinessAnalysis } from "@/lib/business/understanding/types";

/**
 * Optional AI intelligence provider.
 * Core generation NEVER requires an implementation.
 */
export interface BusinessIntelligenceProvider {
  analyze(profile: BusinessProfile): Promise<BusinessAnalysis>;
}

/** No-op provider for tests / hybrid failure simulation. */
export class UnavailableBusinessIntelligence
  implements BusinessIntelligenceProvider
{
  async analyze(): Promise<BusinessAnalysis> {
    throw new Error("AI provider unavailable");
  }
}
