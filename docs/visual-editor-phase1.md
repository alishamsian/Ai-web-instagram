# Visual Editor — Phase 1 Foundation (1.1 hardened)

## Architecture

```text
GrapesJS = visual editing engine
WebsiteConfig = canonical application model
Classic Editor = fallback product editor
Visual Editor persistence = existing PATCH /api/websites/[id] + expectedVersion
```

Dependency direction:

```text
Product UI (VisualEditorShell)
        ↓
lib/visual-editor (controller, adapter, projection, sync, save queue)
        ↓
GrapesJS (browser-only)
        ↓
WebsiteConfig.visualEditor.project  (projection)
        + content.* synced via data-content-path
        ↓
Existing save / publish / WebsiteRenderer (classic fields unchanged)
```

## Routes

| Route | Editor |
|---|---|
| `/[locale]/editor/[websiteId]` | Classic Editor (unchanged) |
| `/[locale]/editor/[websiteId]/visual` | Visual Editor (GrapesJS) |

## Projection priority (`websiteConfigToVisualProject`)

1. Existing `visualEditor.project` (saved visual work)
2. Projection from real `WebsiteConfig` sections + content
3. Dev seed **only** when the site has no renderable content

## Lossless rule

`applyVisualProjectToWebsiteConfig` / `syncWebsiteConfigFromVisualProject`:

- merges GrapesJS `getProjectData()` into `config.visualEditor`
- syncs known `data-content-path` fields back into `content.*`
- updates section visibility/order when `data-section-id` nodes exist
- **never drops** sections missing from the canvas (orphans preserved)
- **never drops** brand / seo / settings / media / unknown fields

WebsiteRenderer / Classic Editor ignore `visualEditor`.

## Editor UI state (never persisted)

- Zoom (`Canvas.setZoom`)
- Device (Desktop / Tablet / Mobile)

## History boundary

GrapesJS `UndoManager` is editor-session history only.
Classic Editor uses `lib/editor/history`.
They are intentionally separate in Phase 1.

## Assets

Site `config.media` is loaded into GrapesJS AssetManager.
Selecting an image + clicking an asset replaces `src` / `data-media-id`.
Upload continues via existing `/api/websites/[id]/media` (Classic / API).

## Lifecycle

GrapesJS is created once per mount via refs (not React state).
`isCurrent` + mount IDs prevent React Strict Mode double-init from wiping the canvas.
Editor destroy runs only for the editor instance owned by that mount.

## Phase 2 candidates

- Full WebsiteConfig ↔ canvas section mapping
- Media upload UI in Visual Editor
- Template marketplace / section library depth
- Application-level history sync with GrapesJS UndoManager
