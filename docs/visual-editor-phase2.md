# Visual Editor — Phase 2 Adapter Foundation

Builds on [Phase 1](./visual-editor-phase1.md). WebsiteConfig remains canonical; GrapesJS stays an editing engine.

## Architecture

```text
                    OUR PRODUCT
                         │
          ┌──────────────┴──────────────┐
          │                             │
   WebsiteConfig                  Visual Editor
          │                             │
          │                         GrapesJS
          │                             │
          └──────────────┬──────────────┘
                         ↓
                  WebsiteConfig
                         ↓
                 WebsiteRenderer
                    ↓        ↓
                 Preview    Publish
```

## Adapter version

| `visualEditor.version` | Meaning |
|---|---|
| `1` | Phase 1 foundation (no source fingerprint) |
| `2` | Stable component IDs + `sourceFingerprint` reconcile |

Legacy v1 projects still load. The next Visual save upgrades to v2 and writes `sourceFingerprint`.

## Stable IDs

| Entity | Identity |
|---|---|
| Page | `home`, `about`, plus any extra GrapesJS page ids |
| Section | `WebsiteConfig.sections[].id` → `data-section-id` |
| Component | `visualComponentId(sectionId, role)` → `data-component-id` |
| Content block | `data-content-path` (e.g. `content.hero.headline`) |
| Media | `data-media-id` ↔ `config.media` keys |
| Links | `data-href-path` (e.g. `content.hero.ctaHref`) |

IDs are deterministic from WebsiteConfig; opening the editor does not mint new ids.

## Projection priority (`websiteConfigToVisualProject`)

1. Saved `visualEditor.project` when `sourceFingerprint` matches (or is missing on v1)
2. On Classic/API drift: merge projected reserved pages (`home` / `about`) with saved extra pages
3. Fresh projection from WebsiteConfig when nothing is saved
4. Dev seed only for empty sites with no saved project

## Sync (`applyVisualProjectToWebsiteConfig`)

- Stores GrapesJS `getProjectData()` under `visualEditor.project`
- Syncs `data-content-path` text / media / nested item fields
- Syncs `data-href-path` link targets
- Syncs gallery `imageIds` order from canvas
- Updates section visibility / order / settings; orphans are preserved
- Sets `version: 2` and refreshes `sourceFingerprint`
- Never drops brand / seo / settings / media / unknown fields

## Classic drift

`websiteConfigSourceFingerprint` hashes sections + content + media (+ direction/language/brand colors).

If Classic edits those fields after a Visual save, the next Visual open rebuilds reserved pages from WebsiteConfig while keeping user-created GrapesJS pages.

## Modules

| File | Role |
|---|---|
| `lib/visual-editor/ids.ts` | Stable component / page ids |
| `lib/visual-editor/content-fingerprint.ts` | Source fingerprint |
| `lib/visual-editor/merge-project.ts` | Projected ↔ saved merge |
| `lib/visual-editor/project-from-config.ts` | WebsiteConfig → GrapesJS |
| `lib/visual-editor/sync-from-project.ts` | GrapesJS → WebsiteConfig |
| `lib/visual-editor/adapter.ts` | Public resolve / apply API |

## Out of scope (later)

Templates marketplace, ecommerce depth, AI redesign, Puck (removed permanently).
