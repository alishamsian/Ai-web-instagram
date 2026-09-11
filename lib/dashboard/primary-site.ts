import type { WebsiteRecord } from "@/types/website";

export const PRIMARY_SITE_COOKIE = "vitrin_primary_site";

/** Resolve which site to show: explicit ?id → primary cookie → first. */
export function resolveWorkspaceWebsite(
  websites: WebsiteRecord[],
  opts: { requestedId?: string | null; primaryId?: string | null },
): { website: WebsiteRecord | null; idInvalid: boolean; isPrimary: boolean } {
  if (!websites.length) {
    return { website: null, idInvalid: false, isPrimary: false };
  }

  if (opts.requestedId) {
    const matched = websites.find((site) => site.id === opts.requestedId);
    if (matched) {
      return {
        website: matched,
        idInvalid: false,
        isPrimary:
          matched.id === opts.primaryId ||
          (!opts.primaryId && matched.id === websites[0]?.id),
      };
    }
    const fallback =
      websites.find((site) => site.id === opts.primaryId) ?? websites[0]!;
    return {
      website: fallback,
      idInvalid: true,
      isPrimary:
        fallback.id === opts.primaryId || fallback.id === websites[0]?.id,
    };
  }

  const primary =
    (opts.primaryId
      ? websites.find((site) => site.id === opts.primaryId)
      : null) ?? websites[0]!;
  return {
    website: primary,
    idInvalid: false,
    isPrimary: true,
  };
}
