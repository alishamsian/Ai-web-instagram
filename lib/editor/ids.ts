/**
 * Lightweight entity ID helpers for editor commands and legacy normalization.
 * Commands may still use the runtime factory for newly-created entities, while
 * legacy normalization must use stable content-derived identities.
 */

export type EntityIdFactory = (prefix: string) => string;

let counter = 0;

const defaultFactory: EntityIdFactory = (prefix) => {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
};

let activeFactory: EntityIdFactory = defaultFactory;

/** Override ID generation (tests / deterministic batches). Pass null to restore. */
export function setEntityIdFactory(factory: EntityIdFactory | null) {
  activeFactory = factory ?? defaultFactory;
  if (!factory) counter = 0;
}

export function createEntityId(prefix: string): string {
  return activeFactory(prefix);
}

/**
 * Deterministic ID for legacy records that do not have an identity.
 * The same prefix + seed always produces the same ID without runtime state.
 */
export function createLegacyEntityId(prefix: string, seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

/** Sequential factory for tests — createEntityId("faq") → faq-1, faq-2, … */
export function createSequentialIdFactory(
  start = 0,
): EntityIdFactory {
  let n = start;
  return (prefix) => `${prefix}-${++n}`;
}
