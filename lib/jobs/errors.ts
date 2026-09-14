/** Safe, user-facing import/job error mapping. Keep messages free of internals. */

export function publicError(code?: string) {
  switch (code) {
    case "INVALID_URL":
    case "UNSUPPORTED_URL":
    case "INVALID_USERNAME":
      return { code: "INVALID_URL", message: "Enter a valid Instagram profile URL." };
    case "PRIVATE":
      return {
        code: "PRIVATE",
        message:
          "This profile is private. Connect an account you own or use a public profile.",
      };
    case "NOT_FOUND":
      return {
        code: "NOT_FOUND",
        message: "We couldn't find this Instagram profile.",
      };
    case "RATE_LIMITED":
      return {
        code: "RATE_LIMITED",
        message: "Instagram data is temporarily unavailable. Please try again.",
      };
    case "PROVIDER_UNAVAILABLE":
      return {
        code: "PROVIDER_UNAVAILABLE",
        message: "Instagram import is not configured. Please try again later.",
      };
    case "PROVIDER_TIMEOUT":
      return {
        code: "PROVIDER_TIMEOUT",
        message: "Instagram took too long to respond. Please try again.",
      };
    case "PARTIAL":
      return {
        code: "PARTIAL",
        message:
          "We imported what was available and can still build your website.",
      };
    case "AI_FAILED":
      return {
        code: "AI_FAILED",
        message:
          "We imported your content, but AI analysis needs another attempt.",
      };
    case "MEDIA_PERSIST_FAILED":
      return {
        code: "MEDIA_PERSIST_FAILED",
        message:
          "We couldn't save Instagram media to our storage. Please try again.",
      };
    case "DATABASE_ERROR":
      return {
        code: "DATABASE_ERROR",
        message: "We couldn't save your import. Please try again.",
      };
    case "STORAGE_ERROR":
      return {
        code: "STORAGE_ERROR",
        message: "Storage is temporarily unavailable. Please try again.",
      };
    case "PLAN_LIMIT":
      return {
        code: "PLAN_LIMIT",
        message:
          "You've reached your plan limit. Upgrade or remove an existing site.",
      };
    case "UNKNOWN":
    default:
      return {
        code: "UNKNOWN",
        message: "Something went wrong while importing your profile.",
      };
  }
}
