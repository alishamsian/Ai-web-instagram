export const INSTAGRAM_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "instagr.am",
  "www.instagr.am",
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
  "share",
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

function cleanInput(input: string) {
  return input
    .trim()
    // Invisible / bidi marks from RTL paste
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    // Arabic/Persian question mark sometimes pasted instead of ?
    .replace(/؟/g, "?")
    // Fullwidth slash variants
    .replace(/［/g, "[")
    .replace(/］/g, "]");
}

function isValidUsername(username: string) {
  return /^[A-Za-z0-9._]{1,30}$/.test(username);
}

function asProfile(username: string) {
  return {
    username,
    profileUrl: `https://www.instagram.com/${username}/`,
    canonical: `instagram.com/${username}`,
  };
}

export function normalizeInstagramUrl(input: string) {
  const trimmed = cleanInput(input);
  if (!trimmed) {
    throw new InstagramUrlError("Enter a valid Instagram profile URL.", "INVALID_URL");
  }

  // Bare username or @username
  const bare = trimmed.replace(/^@+/, "");
  if (isValidUsername(bare) && !bare.includes("/")) {
    return asProfile(bare);
  }

  // Drop query/hash before URL parse so ?hl=fa / share params never break paths
  const withoutQuery = trimmed.split(/[?#]/)[0]!.trim();
  const withProtocol = /^https?:\/\//i.test(withoutQuery)
    ? withoutQuery
    : `https://${withoutQuery.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new InstagramUrlError("Enter a valid Instagram profile URL.", "INVALID_URL");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const hostOk =
    INSTAGRAM_HOSTS.has(url.hostname.toLowerCase()) ||
    INSTAGRAM_HOSTS.has(host) ||
    host === "instagram.com" ||
    host === "instagr.am";
  if (!hostOk) {
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

  const first = segments[0]!.toLowerCase().replace(/^@/, "");
  if (RESERVED_PATHS.has(first) || first.startsWith("accounts")) {
    throw new InstagramUrlError(
      "This Instagram URL is not a public profile.",
      "UNSUPPORTED_URL",
    );
  }

  // /username, /username/, /username/reels, /username/tagged — first segment is profile
  const username = first;
  if (!isValidUsername(username)) {
    throw new InstagramUrlError("Enter a valid Instagram username.", "INVALID_USERNAME");
  }

  return asProfile(username);
}

export function isDemoUsername(username: string) {
  return ["demo", "demo.store", "vitrin.demo"].includes(username.toLowerCase());
}
