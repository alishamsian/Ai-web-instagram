# Puck Phase 2 — Editor ownership notes

## Source of truth

`WebsiteConfig` remains the product source of truth.

Puck Data is a **projection** of section structure (order, presence, ids, type, visible, variant, settings) plus a mirrored root snapshot of brand/content/seo/settings/media.

## Mutation paths

| Surface | Writes | How canvas updates |
| --- | --- | --- |
| Canvas DnD / insert / delete | Puck `onChange` → `puckToWebsiteConfig(data, liveConfig)` | React `config` state |
| Inspector content / brand / SEO / site | Existing editor **commands** → `WebsiteConfig` | Live context (`PuckWebsiteProvider`); Puck root synced without remount |
| Layers visibility | `commandToggleSection` → config + Puck props sync | Live context |

## Undo / redo (Phase 2)

- **Owned by Puck history** for structural canvas edits (toolbar Undo/Redo + ⌘Z / ⌘⇧Z).
- Inspector-driven WebsiteConfig edits are **not** dual-stacked into a second app history (avoids fighting stacks).
- Phase 3 may unify AI + history; keep a single ownership model when that lands.

## Unknown sections

Types missing from the registry still round-trip through the adapter. The canvas shows `PuckUnsupportedSection`. Saving never drops them.

## Classic editor

`/[locale]/editor/[websiteId]` remains intact. Puck is opt-in via `/puck` and the Classic link in the Puck top bar.
