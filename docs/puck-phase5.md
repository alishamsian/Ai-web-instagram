# Puck Phase 5 — Demo chrome + Classic parity

## Goal

Make `/[locale]/editor/[websiteId]/puck` feel closer to the official Puck demo
(dark chrome, primary Components drag library, live canvas) while porting
Classic product surfaces — without a second WebsiteConfig or deleting Classic.

## What landed

| Surface | Behavior |
| --- | --- |
| Canvas | `EditorSectionFrame` chrome + inline `EditableText` via `PuckEditBridge` |
| Components | `Puck.Components` is the primary left-rail tab (drag onto canvas) |
| Layers | Visibility, move, duplicate, delete + Puck Outline |
| Assets / Pages | Classic `AssetsPanel` + `PagesPanel` |
| Inspector | Section schema + Content + Brand/Design + Media + SEO + Site (settings/templates/versions) |
| Publish | Classic `PublishDialog` + preflight |
| History / Quality | Classic drawers from top bar |
| Insert-after | Classic `SectionLibrary` from section chrome “+” |
| Page views | Non-home pages render `WebsiteRenderer` in editor mode |

## Source of truth

Still `WebsiteConfig`. Puck Data remains a projection. Mutations go through
existing editor commands / `applyConfig`.

## Classic

`/[locale]/editor/[websiteId]` is untouched and remains available from the
Puck top bar.
