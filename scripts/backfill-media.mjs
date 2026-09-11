/**
 * One-off: re-host Instagram CDN URLs on website configs into Supabase Storage.
 * Usage: node --env-file=.env.local scripts/backfill-media.mjs [slug]
 */
import { createClient } from "@supabase/supabase-js";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR = "getascraper~http-request-runner";
const BUCKET = "vitrin-media";
const BATCH = 8;

function isIg(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return (
      h.includes("fbcdn.net") ||
      h.includes("cdninstagram.com") ||
      h.endsWith("instagram.com")
    );
  } catch {
    return false;
  }
}

async function downloadViaApify(urls, token) {
  const map = new Map();
  const endpoint = `${APIFY_BASE}/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=120`;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: batch.map((url) => ({ url, method: "GET" })),
      }),
      signal: AbortSignal.timeout(130_000),
    });
    if (!res.ok) {
      console.warn("apify batch failed", res.status);
      continue;
    }
    const items = await res.json();
    for (const item of items) {
      const url = item.requestedUrl || item.finalUrl;
      if (!url || item.statusCode !== 200 || !item.body) continue;
      const body = Buffer.from(item.body, "base64");
      map.set(url, {
        body,
        contentType: (item.contentType || "image/jpeg").split(";")[0].trim(),
      });
    }
  }
  return map;
}

async function ensureBucket(db) {
  const { data: buckets } = await db.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await db.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  }
}

async function main() {
  const slug = process.argv[2] || "sibnet.store";
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.APIFY_API_TOKEN;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  if (!token) throw new Error("Missing APIFY_API_TOKEN");

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: site, error } = await db
    .from("websites")
    .select("id, slug, config")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!site) throw new Error(`Website not found: ${slug}`);

  const config = structuredClone(site.config);
  const media = config.media || {};
  const igUrls = new Set();
  for (const asset of Object.values(media)) {
    if (isIg(asset.url)) igUrls.add(asset.url);
    if (asset.videoUrl && isIg(asset.videoUrl)) igUrls.add(asset.videoUrl);
  }
  console.log(`site=${slug} igUrls=${igUrls.size}`);
  if (igUrls.size === 0) {
    console.log("nothing to do");
    return;
  }

  await ensureBucket(db);
  const downloaded = await downloadViaApify([...igUrls], token);
  console.log(`downloaded=${downloaded.size}`);

  const map = new Map();
  let i = 0;
  for (const [original, file] of downloaded) {
    const ext = file.contentType.includes("mp4") ? "mp4" : "jpg";
    const keyPath = `${slug}/legacy-${i++}.${ext}`;
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(keyPath, file.body, {
        contentType: file.contentType,
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });
    if (upErr) {
      console.warn("upload failed", keyPath, upErr.message);
      continue;
    }
    const publicUrl = `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${keyPath}`;
    map.set(original, publicUrl);
  }

  for (const asset of Object.values(media)) {
    asset.url = map.get(asset.url) ?? asset.url;
    if (asset.videoUrl) asset.videoUrl = map.get(asset.videoUrl) ?? asset.videoUrl;
  }
  if (config.brand?.logo && map.has(config.brand.logo)) {
    config.brand.logo = map.get(config.brand.logo);
  } else if (media.logo?.url) {
    config.brand.logo = media.logo.url;
  }

  const { error: saveErr } = await db
    .from("websites")
    .update({ config, updated_at: new Date().toISOString() })
    .eq("id", site.id);
  if (saveErr) throw saveErr;

  console.log(`rewrote ${map.size} urls`);
  console.log(
    "sample",
    Object.values(media)
      .slice(0, 2)
      .map((m) => m.url),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
