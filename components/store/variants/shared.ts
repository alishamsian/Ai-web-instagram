import type { WebsiteConfig, SectionConfig } from "@/types/website";
import { resolveSectionVariant } from "@/lib/store/registry/variant-api";
import type { RegistrySectionType } from "@/lib/store/registry/types";

export function isFa(config: WebsiteConfig) {
  return config.settings.language === "fa";
}

export function canonicalVariant(
  sectionType: RegistrySectionType,
  section?: SectionConfig | null,
  fallbackRaw?: string | null,
) {
  return resolveSectionVariant(
    sectionType,
    section?.variant ?? fallbackRaw ?? null,
  );
}
