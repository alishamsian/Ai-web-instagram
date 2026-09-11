import type { AppStore } from "@/lib/database/store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "vitrin-data";
const OBJECT = "app/store.json";

const EMPTY: AppStore = {
  users: [],
  workspaces: [],
  jobs: [],
  imports: [],
  websites: [],
  versions: [],
  domains: [],
};

async function ensureBucket() {
  const db = getSupabaseAdmin();
  const { data: buckets, error: listError } = await db.storage.listBuckets();
  if (listError) throw listError;
  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    const { error } = await db.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 50 * 1024 * 1024,
    });
    // race: bucket may already exist
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw error;
    }
  }
}

export async function readBlobStore(): Promise<AppStore> {
  const db = getSupabaseAdmin();
  await ensureBucket();
  const { data, error } = await db.storage.from(BUCKET).download(OBJECT);
  if (error) {
    if (/not found|404|Object not found/i.test(error.message)) {
      return structuredClone(EMPTY);
    }
    throw error;
  }
  const text = await data.text();
  return { ...EMPTY, ...(JSON.parse(text) as AppStore) };
}

export async function writeBlobStore(store: AppStore) {
  const db = getSupabaseAdmin();
  await ensureBucket();
  const body = JSON.stringify(store, null, 2);
  const { error } = await db.storage.from(BUCKET).upload(OBJECT, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}
