import { readStore } from "@/lib/database/store";
import type { ImportJob } from "@/types/jobs";
import type { InstagramImport } from "@/types/instagram";
import type { WebsiteRecord } from "@/types/website";

export type WorkspaceDashboardData = {
  websites: WebsiteRecord[];
  imports: InstagramImport[];
  jobs: ImportJob[];
};

export async function getWorkspaceDashboardData(
  workspaceId: string,
): Promise<WorkspaceDashboardData> {
  const store = await readStore();
  const websites = store.websites
    .filter((item) => item.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const imports = store.imports
    .filter((item) => item.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const jobs = store.jobs
    .filter((item) => item.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return { websites, imports, jobs };
}

export function siteCoverUrl(site: WebsiteRecord): string | null {
  if (site.config.brand.logo) return site.config.brand.logo;
  const heroId = site.config.content.hero.imageId;
  if (heroId && site.config.media[heroId]?.url) {
    return site.config.media[heroId].url;
  }
  const gallery = site.config.content.gallery?.imageIds ?? [];
  for (const id of gallery) {
    if (site.config.media[id]?.url) return site.config.media[id].url;
  }
  const firstMedia = Object.values(site.config.media)[0];
  return firstMedia?.url ?? null;
}

export function formatRelativeTime(iso: string, locale: "fa" | "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60_000));
  if (mins < 1) return locale === "fa" ? "همین الان" : "Just now";
  if (mins < 60) {
    return locale === "fa" ? `${mins} دقیقه پیش` : `${mins}m ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return locale === "fa" ? `${hours} ساعت پیش` : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return locale === "fa" ? `${days} روز پیش` : `${days}d ago`;
}

export function jobStageLabel(
  stage: ImportJob["stage"],
  dict: {
    connecting: string;
    profileFound: string;
    reading: string;
    postsImported: string;
    understanding: string;
    creating: string;
    ready: string;
  },
) {
  switch (stage) {
    case "connecting":
      return dict.connecting;
    case "profile_found":
      return dict.profileFound;
    case "reading_content":
      return dict.reading;
    case "posts_imported":
      return dict.postsImported;
    case "understanding_brand":
      return dict.understanding;
    case "creating_website":
      return dict.creating;
    case "ready":
      return dict.ready;
    default:
      return stage;
  }
}
