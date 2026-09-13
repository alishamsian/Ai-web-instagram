import type { VerticalId, VerticalPack } from "@/lib/store/verticals/types";

const registry = new Map<string, VerticalPack>();

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

export function registerVertical(pack: VerticalPack): { ok: true } | { ok: false; reason: string } {
  const id = normalizeId(pack.id);
  if (!id) return { ok: false, reason: "Vertical id is required" };
  if (registry.has(id)) {
    return { ok: false, reason: `Duplicate vertical: ${id}` };
  }
  registry.set(id, { ...pack, id: id as VerticalPack["id"] });
  return { ok: true };
}

export function registerVerticals(packs: VerticalPack[]) {
  for (const pack of packs) {
    const result = registerVertical(pack);
    if (!result.ok) {
      console.error(`[verticals] ${result.reason}`);
    }
  }
}

export function getVertical(id: string | null | undefined): VerticalPack | undefined {
  if (id == null || id === "") return undefined;
  return registry.get(normalizeId(id));
}

export function hasVertical(id: string | null | undefined): boolean {
  return Boolean(getVertical(id));
}

export function getVerticals(): VerticalPack[] {
  return [...registry.values()];
}

export function getVerticalIds(): string[] {
  return [...registry.keys()];
}

/** Test helper — clears and re-seeds. */
export function resetVerticalRegistryForTests(packs: VerticalPack[] = []) {
  registry.clear();
  registerVerticals(packs);
}

export type { VerticalId };
