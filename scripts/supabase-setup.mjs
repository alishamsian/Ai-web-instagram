#!/usr/bin/env node
/**
 * Validates Supabase env + schema, and opens the dashboard helpers.
 * Usage: npm run supabase:setup
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim();
    if (!(key in process.env) || !process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";
const secret =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";

const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log("Supabase setup check");
console.log("- URL:", url ? "ok" : "MISSING");
console.log("- Publishable/anon key:", publishable ? "ok" : "MISSING");
console.log("- Service/secret key:", secret ? "ok" : "MISSING (needed for DB writes)");

const schemaPath = path.join(root, "supabase", "schema.sql");
if (process.platform === "darwin" && fs.existsSync(schemaPath)) {
  spawnSync("pbcopy", {
    input: fs.readFileSync(schemaPath),
    stdio: ["pipe", "ignore", "ignore"],
  });
  console.log("- schema.sql copied to clipboard");
}

if (projectRef && process.platform === "darwin") {
  spawnSync("open", [
    `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
  ]);
  spawnSync("open", [
    `https://supabase.com/dashboard/project/${projectRef}/settings/api-keys`,
  ]);
  console.log("- opened SQL Editor + API Keys in browser");
}

async function main() {
  if (!url || !publishable) {
    console.log(
      "\nAdd NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local",
    );
    process.exit(1);
  }

  const headers = {
    apikey: publishable,
    Authorization: `Bearer ${publishable}`,
  };
  const tableRes = await fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
    headers,
  });
  const tableBody = await tableRes.text();

  if (tableRes.status === 200) {
    console.log("- schema: workspaces table OK");
  } else if (
    tableBody.includes("PGRST205") ||
    tableBody.includes("Could not find the table")
  ) {
    console.log(
      "- schema: MISSING — paste clipboard into SQL Editor and click Run",
    );
  } else {
    console.log("- schema probe:", tableRes.status, tableBody.slice(0, 160));
  }

  if (secret) {
    const { createClient } = require("@supabase/supabase-js");
    const db = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await db.from("workspaces").select("id").limit(1);
    if (error) {
      console.log("- admin client:", error.message);
      process.exit(1);
    }
    console.log("- admin client: OK — persistence enabled");
  } else {
    console.log("\nNext: copy the secret/service_role key into .env.local as:");
    console.log("  SUPABASE_SERVICE_ROLE_KEY=...");
    console.log("Then re-run: npm run supabase:setup");
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
