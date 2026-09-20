/** Shared drag payload for library → canvas (getData is empty during dragover). */

let activeLibraryBlockId: string | null = null;

export function setActiveLibraryDrag(blockId: string | null) {
  activeLibraryBlockId = blockId;
}

export function getActiveLibraryDrag(): string | null {
  return activeLibraryBlockId;
}
