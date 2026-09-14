import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSupabaseConfigured } from "@/lib/config/env";
import { requirePersistence } from "@/lib/config/runtime";
import { readSupabaseStore, writeSupabaseStore } from "@/lib/database/supabase-store";
import type { ImportJob } from "@/types/jobs";
import type { InstagramImport } from "@/types/instagram";
import type { User, Workspace } from "@/types/user";
import type { DomainRecord, WebsiteRecord, WebsiteVersion } from "@/types/website";

export interface AppStore {
  users: User[];
  workspaces: Workspace[];
  jobs: ImportJob[];
  imports: InstagramImport[];
  websites: WebsiteRecord[];
  versions: WebsiteVersion[];
  domains: DomainRecord[];
}

const EMPTY: AppStore = { users: [], workspaces: [], jobs: [], imports: [], websites: [], versions: [], domains: [] };
const memory: AppStore = structuredClone(EMPTY);
const DATA_PATH = path.join(process.cwd(), ".data", "store.json");

async function ensureFile() {
  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  try { await readFile(DATA_PATH, "utf8"); }
  catch { await writeFile(DATA_PATH, JSON.stringify(EMPTY, null, 2)); }
}

async function readFileStore(): Promise<AppStore> {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") requirePersistence();
  try {
    await ensureFile();
    const raw = await readFile(DATA_PATH, "utf8");
    return { ...EMPTY, ...(JSON.parse(raw) as AppStore) };
  } catch { return structuredClone(memory); }
}

export async function readStore(): Promise<AppStore> {
  requirePersistence();
  if (isSupabaseConfigured()) return readSupabaseStore();
  return readFileStore();
}

export async function writeStore(mutator: (store: AppStore) => void) {
  requirePersistence();
  if (isSupabaseConfigured()) {
    const before = await readSupabaseStore();
    const after = structuredClone(before);
    mutator(after);
    await writeSupabaseStore(before, after);
    return after;
  }
  const store = await readFileStore();
  mutator(store);
  Object.assign(memory, store);
  if (!process.env.VERCEL) {
    await ensureFile();
    await writeFile(DATA_PATH, JSON.stringify(store, null, 2));
  }
  return store;
}
