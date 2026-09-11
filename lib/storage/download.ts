import { isApifyConfigured } from "@/lib/config/env";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "getascraper/http-request-runner";
const BATCH_SIZE = 8;
const BATCH_TIMEOUT_MS = 120_000;

export function isInstagramCdnUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("fbcdn.net") ||
      host.includes("cdninstagram.com") ||
      host.endsWith("instagram.com")
    );
  } catch {
    return false;
  }
}

export type DownloadedMedia = {
  url: string;
  body: Uint8Array;
  contentType: string;
};

async function downloadDirect(url: string): Promise<DownloadedMedia | null> {
  try {
    const response = await fetch(url, {
      headers: {
        accept: "image/*,video/*,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (compatible; VitrinBot/1.0; +https://vitrin.app)",
      },
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });
    if (!response.ok) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length < 32) return null;
    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      guessContentType(url, buffer);
    return { url, body: buffer, contentType };
  } catch {
    return null;
  }
}

function guessContentType(url: string, body: Uint8Array) {
  if (body[0] === 0xff && body[1] === 0xd8) return "image/jpeg";
  if (body[0] === 0x89 && body[1] === 0x50) return "image/png";
  if (body[0] === 0x52 && body[1] === 0x49) return "image/webp";
  if (url.includes(".mp4") || url.includes("video")) return "video/mp4";
  return "application/octet-stream";
}

type ApifyHttpItem = {
  requestedUrl?: string;
  finalUrl?: string;
  statusCode?: number;
  ok?: boolean;
  body?: string;
  bodyEncoding?: string;
  contentType?: string;
};

async function downloadViaApify(urls: string[]): Promise<Map<string, DownloadedMedia>> {
  const result = new Map<string, DownloadedMedia>();
  const token = process.env.APIFY_API_TOKEN;
  if (!token || urls.length === 0) return result;

  const encodedActor = ACTOR_ID.replace("/", "~");
  const timeoutSec = Math.ceil(BATCH_TIMEOUT_MS / 1000);
  const endpoint = `${APIFY_BASE}/acts/${encodedActor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutSec}`;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: batch.map((url) => ({ url, method: "GET" })),
        }),
        signal: AbortSignal.timeout(BATCH_TIMEOUT_MS + 5_000),
      });
      if (!response.ok) continue;
      const items = (await response.json()) as ApifyHttpItem[];
      for (const item of items) {
        const sourceUrl = item.requestedUrl || item.finalUrl;
        if (!sourceUrl || !item.body || item.statusCode !== 200) continue;
        const encoding = (item.bodyEncoding || "base64").toLowerCase();
        const body =
          encoding === "base64"
            ? Uint8Array.from(Buffer.from(item.body, "base64"))
            : Uint8Array.from(Buffer.from(item.body, "binary"));
        if (body.length < 32) continue;
        // Reject JPEG magic check only when content claims image and fails
        const contentType =
          item.contentType?.split(";")[0]?.trim() ||
          guessContentType(sourceUrl, body);
        result.set(sourceUrl, { url: sourceUrl, body, contentType });
      }
    } catch {
      // Keep whatever succeeded in earlier batches.
    }
  }

  return result;
}

/**
 * Download Instagram CDN (or any) media bytes.
 * Tries a direct fetch first; falls back to Apify cloud fetch for blocked CDNs.
 */
export async function downloadMediaUrls(
  urls: string[],
): Promise<Map<string, DownloadedMedia>> {
  const unique = [...new Set(urls.filter(Boolean))];
  const result = new Map<string, DownloadedMedia>();
  const missing: string[] = [];

  await Promise.all(
    unique.map(async (url) => {
      const direct = await downloadDirect(url);
      if (direct) result.set(url, direct);
      else missing.push(url);
    }),
  );

  if (missing.length > 0 && isApifyConfigured()) {
    const viaApify = await downloadViaApify(missing);
    for (const [url, media] of viaApify) {
      result.set(url, media);
    }
  }

  return result;
}
