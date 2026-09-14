/**
 * Lightweight entity ID factory for editor commands.
 * Commands are deterministic when an explicit `id` is supplied in the input.
 * When omitted, `createEntityId` uses the active factory (default: time+counter).
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

/** Sequential factory for tests — createEntityId("faq") → faq-1, faq-2, … */
export function createSequentialIdFactory(
  start = 0,
): EntityIdFactory {
  let n = start;
  return (prefix) => `${prefix}-${++n}`;
}
