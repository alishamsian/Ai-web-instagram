export const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
]);

const RESERVED_PATHS = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "accounts",
  "direct",
  "explore",
  "tv",
  "legal",
  "about",
  "developer",
  "directory",
  "lite",
]);

export class InstagramUrlError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_URL"
      | "UNSUPPORTED_URL"
      | "INVALID_USERNAME",
  ) {
    super(message);
    this.name = "InstagramUrlError";
  }
}

export function normalizeInstagramUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new InstagramUrlError("Enter a valid Instagram profile URL.", "INVALID_URL");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new InstagramUrlError("Enter a valid Instagram profile URL.", "INVALID_URL");
  }

  const host = url.hostname.toLowerCase();
  if (!INSTAGRAM_HOSTS.has(host)) {
    throw new InstagramUrlError(
      "Only Instagram profile URLs are supported.",
      "UNSUPPORTED_URL",
    );
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new InstagramUrlError(
      "Enter a valid Instagram profile URL.",
      "INVALID_URL",
    );
  }

  const first = segments[0].toLowerCase();
  if (RESERVED_PATHS.has(first) || first.startsWith("accounts")) {
    throw new InstagramUrlError(
      "This Instagram URL is not a public profile.",
      "UNSUPPORTED_URL",
    );
  }

  if (segments.length > 2) {
    throw new InstagramUrlError(
      "This Instagram URL is not a public profile.",
      "UNSUPPORTED_URL",
    );
  }

  const username = segments[0].replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    throw new InstagramUrlError("Enter a valid Instagram username.", "INVALID_USERNAME");
  }

  return {
    username,
    profileUrl: `https://www.instagram.com/${username}/`,
    canonical: `instagram.com/${username}`,
  };
}

export function isDemoUsername(username: string) {
  return ["demo", "demo.store", "vitrin.demo"].includes(username.toLowerCase());
}
