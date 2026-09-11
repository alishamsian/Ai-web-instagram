export type ImportJobStatus =
  | "queued"
  | "scraping"
  | "processing"
  | "analyzing"
  | "generating"
  | "completed"
  | "failed";

export type ImportJobStage =
  | "connecting"
  | "profile_found"
  | "reading_content"
  | "posts_imported"
  | "understanding_brand"
  | "creating_website"
  | "ready";

export interface ImportJob {
  id: string;
  workspaceId: string;
  userId: string;
  sourceUrl: string;
  username: string | null;
  status: ImportJobStatus;
  stage: ImportJobStage;
  scrapeStatus?: import("./instagram").ScrapeStatus;
  collector: string;
  importId?: string;
  websiteId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  postsImported: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const PERMANENT_JOB_ERRORS = [
  "PRIVATE",
  "NOT_FOUND",
  "INVALID_URL",
  "LOGIN_REQUIRED",
] as const;
