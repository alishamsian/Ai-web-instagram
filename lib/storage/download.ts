import { isApifyConfigured } from "@/lib/config/env";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "getascraper/http-request-runner";
const BATCH_SIZE = 8;
const BATCH_TIMEOUT_MS = 120_000;
/** Hard cap per media object — prevents OOM on unbounded CDN responses. */
export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * Strict Instagram CDN / host allowlist (suffix-safe).
 * Rejects IP hosts, localhost, and lookalike domains.
 */
export function isInstagramCdnUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      host.includes(":")
    ) {
      return false;
    }
    return (
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "cdninstagram.com" ||
      host.endsWith(".cdninstagram.com") ||
      host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net")
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

async function readBodyLimited(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length > maxBytes || buffer.length < 32) return null;
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.length) continue;
    total += value.length;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      return null;
    }
    chunks.push(value);
  }
  if (total < 32) return null;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function downloadDirect(url: string): Promise<DownloadedMedia | null> {
  if (!isInstagramCdnUrl(url)) return null;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.instagram.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) return null;
    // Re-validate after redirects (SSRF / open redirect).
    if (response.url && !isInstagramCdnUrl(response.url)) return null;
    const buffer = await readBodyLimited(response, MAX_MEDIA_BYTES);
    if (!buffer) return null;
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

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  if (items.length === 0) return;
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index]!);
    }
  };
  const pool = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: pool }, () => run()));
}

async function downloadViaApify(urls: string[]): Promise<Map<string, DownloadedMedia>> {
  const result = new Map<string, DownloadedMedia>();
  const token = process.env.APIFY_API_TOKEN;
  if (!token || urls.length === 0) return result;

  const encodedActor = ACTOR_ID.replace("/", "~");
  const timeoutSec = Math.ceil(BATCH_TIMEOUT_MS / 1000);
  const endpoint = `${APIFY_BASE}/acts/${encodedActor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutSec}`;

  const batches: string[][] = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  // Up to 2 Apify download batches in flight (CDN fallback path).
  await mapPool(batches, 2, async (batch) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requests: batch.map((url) => ({ url, method: "GET" })),
        }),
        signal: AbortSignal.timeout(BATCH_TIMEOUT_MS + 5_000),
      });
      if (!response.ok) return;
      const items = (await response.json()) as ApifyHttpItem[];
      for (const item of items) {
        const sourceUrl = item.requestedUrl || item.finalUrl;
        if (!sourceUrl || !item.body || item.statusCode !== 200) continue;
        if (!isInstagramCdnUrl(sourceUrl)) continue;
        if (item.finalUrl && !isInstagramCdnUrl(item.finalUrl)) continue;
        const encoding = (item.bodyEncoding || "base64").toLowerCase();
        const body =
          encoding === "base64"
            ? Uint8Array.from(Buffer.from(item.body, "base64"))
            : Uint8Array.from(Buffer.from(item.body, "binary"));
        if (body.length < 32 || body.length > MAX_MEDIA_BYTES) continue;
        const contentType =
          item.contentType?.split(";")[0]?.trim() ||
          guessContentType(sourceUrl, body);
        result.set(sourceUrl, { url: sourceUrl, body, contentType });
      }
    } catch {
      // Keep whatever succeeded in other batches.
    }
  });

  return result;
}

/**
 * Download Instagram CDN media bytes.
 * Tries a direct fetch first; falls back to Apify cloud fetch for blocked CDNs.
 * Only allowlisted HTTPS hosts are fetched.
 */
export async function downloadMediaUrls(
  urls: string[],
): Promise<Map<string, DownloadedMedia>> {
  const unique = [
    ...new Set(urls.filter((url) => url && isInstagramCdnUrl(url))),
  ];
  const result = new Map<string, DownloadedMedia>();
  const missing: string[] = [];

  // Modest concurrency — IG CDN often closes burst connections.
  await mapPool(unique, 4, async (url) => {
    const direct = await downloadDirect(url);
    if (direct) result.set(url, direct);
    else missing.push(url);
  });

  if (missing.length > 0 && isApifyConfigured()) {
    const viaApify = await downloadViaApify(missing);
    for (const [url, media] of viaApify) {
      result.set(url, media);
    }
  }

  return result;
}
