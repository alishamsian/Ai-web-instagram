# Puck Editor Migration — Phase 1

Status: **Foundation complete**. Classic editor is untouched and remains the default.

## Architecture

```text
AI / Templates
    ↓
WebsiteConfig   ← canonical source of truth (unchanged)
    ↓
lib/puck/adapter  (websiteConfigToPuck / puckToWebsiteConfig)
    ↓
Puck visual surface  (/editor/[id]/puck)
    ↓
WebsiteConfig
    ↓
WebsiteRenderer / publish (unchanged)
```

Puck Data is an **editing projection only**. It is never the permanent backend format.

## Routes

| Route | Editor |
| --- | --- |
| `/[locale]/editor/[websiteId]` | Classic `EditorShell` (default) |
| `/[locale]/editor/[websiteId]/puck` | Experimental `PuckEditorShell` |

Classic top bar includes a non-destructive **Puck** link. Puck UI includes a **Back to classic** banner.

## Key files (created — nothing deleted)

| Path | Role |
| --- | --- |
| `lib/puck/adapter.ts` | Lossless WebsiteConfig ↔ Puck Data |
| `lib/puck/config.tsx` | Puck Config from Section Registry |
| `lib/puck/website-context.tsx` | Live config for section renderers |
| `components/editor/puck/PuckEditorShell.tsx` | Parallel shell + autosave PATCH |
| `components/editor/puck/PuckFallbackBanner.tsx` | Fallback UX |
| `app/.../editor/[websiteId]/puck/page.tsx` | Parallel route |
| `tests/puck-adapter.test.ts` | Round-trip + registry coverage |

## What Phase 1 supports

- Load any existing WebsiteConfig into Puck without dropping sections/brand/content/seo/media/settings
- Convert Puck edits back to WebsiteConfig (order, visibility, variant, settings)
- Render real store sections via existing registry renderers
- Autosave via existing `/api/websites/[id]` + optimistic versioning
- Desktop / tablet / mobile viewports (Puck built-in)
- RTL `dir` from `settings.direction`

## Explicitly deferred to later phases

- Full professional UI redesign (Phase 2)
- Rich inspector (typography, spacing, media pickers)
- AI command bar wired into Puck (Phase 3) — AI still uses `EditorAction` on classic
- Product-page editing inside Puck canvas
- Making Puck the primary editor (Phase 5 cutover)
- **Any deletion of classic editor code** (forbidden until explicit user approval)

## Tests

```bash
npx vitest run tests/puck-adapter.test.ts
npm run typecheck && npm run lint && npm run build
```
