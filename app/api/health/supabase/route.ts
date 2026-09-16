import { NextResponse } from "next/server";
import {
  getRuntimeMode,
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  isSupabasePublicConfigured,
} from "@/lib/config/env";

export async function GET() {
  const url = getSupabaseUrl();
  const publishable = getSupabasePublishableKey();
  const publicOk = isSupabasePublicConfigured();
  const adminOk = isSupabaseConfigured();
  const isProd = process.env.NODE_ENV === "production";

  let schema: "ok" | "missing" | "error" | "skipped" = "skipped";
  let schemaDetail: string | null = null;
  let storage: "ok" | "error" | "skipped" = "skipped";
  let storageDetail: string | null = null;

  if (publicOk) {
    try {
      const res = await fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
        headers: {
          apikey: publishable,
          Authorization: `Bearer ${publishable}`,
        },
        cache: "no-store",
      });
      const body = await res.text();
      if (res.ok) {
        schema = "ok";
      } else if (
        body.includes("PGRST205") ||
        body.includes("Could not find the table")
      ) {
        schema = "missing";
        schemaDetail = isProd
          ? "schema_missing"
          : "Tables missing — app uses Supabase Storage blob until schema.sql is applied.";
      } else {
        schema = "error";
        schemaDetail = isProd ? "schema_probe_failed" : body.slice(0, 200);
      }
    } catch (error) {
      schema = "error";
      schemaDetail = isProd
        ? "schema_probe_failed"
        : error instanceof Error
          ? error.message
          : "probe_failed";
    }
  }

  if (adminOk && schema === "missing") {
    try {
      const { readBlobStore, writeBlobStore } = await import(
        "@/lib/database/supabase-blob-store"
      );
      const store = await readBlobStore();
      await writeBlobStore(store);
      storage = "ok";
    } catch (error) {
      storage = "error";
      storageDetail = isProd
        ? "storage_probe_failed"
        : error instanceof Error
          ? error.message
          : "storage_failed";
    }
  }

  const ready =
    adminOk && (schema === "ok" || (schema === "missing" && storage === "ok"));

  return NextResponse.json({
    publicConfigured: publicOk,
    adminConfigured: adminOk,
    schema,
    schemaDetail,
    storage,
    storageDetail,
    mode: getRuntimeMode(),
    ready,
  });
}
