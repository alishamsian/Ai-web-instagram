/**
 * Reusable visual component foundation (Phase 2.4).
 * Product-owned registry only — no second website content schema,
 * no global sync across pages yet.
 */

export type ReusableVisualComponent = {
  id: string;
  type: string;
  variant?: string;
  name: string;
  description?: string;
  schemaVersion: number;
  /** Registry block id this reusable points at */
  sourceBlockId: string;
  createdAt: string;
};

const SCHEMA_VERSION = 1;

/** In-memory product foundation — persistence wired in a later phase. */
const store: ReusableVisualComponent[] = [];

export function listReusableComponents(): ReusableVisualComponent[] {
  return [...store];
}

export function getReusableComponent(
  id: string,
): ReusableVisualComponent | undefined {
  return store.find((c) => c.id === id);
}

export function registerReusableComponent(input: {
  type: string;
  name: string;
  sourceBlockId: string;
  variant?: string;
  description?: string;
  id?: string;
}): ReusableVisualComponent {
  const id =
    input.id ||
    `reusable-${input.sourceBlockId}-${Date.now().toString(36)}`;
  if (store.some((c) => c.id === id)) {
    throw new Error(`Reusable component already exists: ${id}`);
  }
  const entry: ReusableVisualComponent = {
    id,
    type: input.type,
    variant: input.variant,
    name: input.name,
    description: input.description,
    schemaVersion: SCHEMA_VERSION,
    sourceBlockId: input.sourceBlockId,
    createdAt: new Date().toISOString(),
  };
  store.push(entry);
  return entry;
}

export function removeReusableComponent(id: string): boolean {
  const idx = store.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  store.splice(idx, 1);
  return true;
}

/** Test helper — clear foundation store. */
export function resetReusableComponentStore(): void {
  store.length = 0;
}

export const REUSABLE_SCHEMA_VERSION = SCHEMA_VERSION;
