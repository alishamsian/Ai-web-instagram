import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@/lib/utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseUrl, isSupabaseConfigured } from "@/lib/config/env";
import type { MediaStorage, StoredMedia } from "@/types/media";

const MEDIA_BUCKET = "vitrin-media";

function mediaTypeFromContentType(contentType: string): "image" | "video" {
  return contentType.startsWith("video") ? "video" : "image";
}

export class LocalMediaStorage implements MediaStorage {
  getPublicUrl(key: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return `${base.replace(/\/$/, "")}/media/${key}`;
  }

  async upload(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StoredMedia> {
    const filePath = path.join(process.cwd(), "public", "media", params.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, params.body);
    return {
      id: createId("media"),
      originalUrl: params.key,
      storageKey: params.key,
      publicUrl: this.getPublicUrl(params.key),
      type: mediaTypeFromContentType(params.contentType),
      createdAt: new Date(),
    };
  }

  async delete() {
    return;
  }
}

export class SupabaseMediaStorage implements MediaStorage {
  private bucketReady: Promise<void> | null = null;

  private ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = this.createBucketIfNeeded().catch((error) => {
        this.bucketReady = null;
        throw error;
      });
    }
    return this.bucketReady;
  }

  private async createBucketIfNeeded() {
    const db = getSupabaseAdmin();
    const { data: buckets, error: listError } = await db.storage.listBuckets();
    if (listError) throw listError;
    if (!buckets?.some((bucket) => bucket.name === MEDIA_BUCKET)) {
      const { error } = await db.storage.createBucket(MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024,
      });
      if (error && !/already exists|duplicate/i.test(error.message)) {
        throw error;
      }
    }
  }

  getPublicUrl(key: string) {
    const base = getSupabaseUrl().replace(/\/$/, "");
    return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${key}`;
  }

  async upload(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StoredMedia> {
    await this.ensureBucket();
    const db = getSupabaseAdmin();
    const body =
      params.body instanceof Buffer ? params.body : Buffer.from(params.body);

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await db.storage
        .from(MEDIA_BUCKET)
        .upload(params.key, body, {
          contentType: params.contentType,
          upsert: true,
          cacheControl: "public, max-age=31536000, immutable",
        });
      if (!error) {
        return {
          id: createId("media"),
          originalUrl: params.key,
          storageKey: params.key,
          publicUrl: this.getPublicUrl(params.key),
          type: mediaTypeFromContentType(params.contentType),
          createdAt: new Date(),
        };
      }
      lastError = error;
      // Transient network blips ("fetch failed") — brief backoff then retry.
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
    throw lastError;
  }

  async delete(key: string) {
    if (!isSupabaseConfigured()) return;
    const db = getSupabaseAdmin();
    await db.storage.from(MEDIA_BUCKET).remove([key]);
  }
}

export class R2MediaStorage implements MediaStorage {
  private endpoint() {
    return (
      process.env.R2_ENDPOINT ??
      `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    );
  }

  getPublicUrl(key: string) {
    const publicBase = process.env.R2_PUBLIC_URL;
    if (publicBase) return `${publicBase.replace(/\/$/, "")}/${key}`;
    return `${this.endpoint()}/${process.env.R2_BUCKET_NAME}/${key}`;
  }

  async upload(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StoredMedia> {
    const url = `${this.endpoint()}/${process.env.R2_BUCKET_NAME}/${params.key}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "content-type": params.contentType,
        authorization: `Bearer ${process.env.R2_ACCESS_KEY_ID}`,
      },
      body: params.body as BodyInit,
    });

    if (!response.ok) {
      throw new Error("Failed to store media in R2.");
    }

    return {
      id: createId("media"),
      originalUrl: params.key,
      storageKey: params.key,
      publicUrl: this.getPublicUrl(params.key),
      type: mediaTypeFromContentType(params.contentType),
      createdAt: new Date(),
    };
  }

  async delete(key: string) {
    const url = `${this.endpoint()}/${process.env.R2_BUCKET_NAME}/${key}`;
    await fetch(url, { method: "DELETE" });
  }
}
