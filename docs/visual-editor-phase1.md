# Visual Editor — Phase 1 Foundation

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
lib/visual-editor (controller, adapter, blocks, seed)
        ↓
GrapesJS (browser-only)
        ↓
WebsiteConfig.visualEditor.project  (projection)
        ↓
Existing save / publish / WebsiteRenderer (classic fields unchanged)
```

## Routes

| Route | Editor |
|---|---|
| `/[locale]/editor/[websiteId]` | Classic Editor (unchanged) |
| `/[locale]/editor/[websiteId]/visual` | Visual Editor (GrapesJS) |

## Lossless rule

`applyVisualProjectToWebsiteConfig` merges GrapesJS `getProjectData()` into `config.visualEditor` and **must not** drop `brand`, `content`, `sections`, `seo`, `settings`, `media`, or unknown future fields.

WebsiteRenderer / Classic Editor ignore `visualEditor`.

## Phase 2 candidates

- Full WebsiteConfig ↔ canvas section mapping
- Asset Manager wired to site media
- Template marketplace / section library depth
- Application-level history sync with GrapesJS UndoManager
